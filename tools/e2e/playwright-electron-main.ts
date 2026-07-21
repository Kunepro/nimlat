import type Database from "better-sqlite3";
import {
	app,
	BrowserWindow,
	dialog,
} from "electron";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
	join,
	resolve,
} from "node:path";
import { Observable } from "rxjs";
import { KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED } from "../../src/constants/main/database-user-keys";
import { Toaster } from "../../src/main/utils/toaster";
import type { AniListMedia } from "../../src/shared/types/ani-list-media-api";
import type { UserReleaseWatchStateDto } from "../../src/shared/types/anime-db";
import type { DownloadReleaseAssetOptions } from "../../src/shared/types/github-release-asset-download";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "../../src/shared/types/jikan-api";
import { ToasterType } from "../../src/shared/types/toaster";

const E2E_IMAGE_DATA_URL        = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='320'%20height='480'%20viewBox='0%200%20320%20480'%3E%3Crect%20width='320'%20height='480'%20fill='%23224466'/%3E%3C/svg%3E";
const E2E_FIXTURE_SNAPSHOT_FILE = "nimlat-e2e-fixture-snapshot.json";

type E2EBootMode = "fresh" | "reuse";

interface E2EMediaIds {
	baseMedia: number;
	relatedMedia: number;
	filmMedia: number;
	reconcileAddedMedia: number;
	reconcileGroupMedia: number;
	libraryHideMedia: number;
	missingMalMedia: number;
	noThumbnailMedia: number;
	missingJikanMedia: number;
	offlineEpisodeMedia: number;
	transientFailureMedia: number;
	releaseWatchUpcomingMedia: number;
	animeDbUpdateMedia: number;
	reconcileRollbackFirstMedia: number;
	reconcileRollbackSecondMedia: number;
}

interface E2EGroupIds {
	sourceGroupId: number;
	targetGroupId: number;
	libraryHideGroupId: number;
	reconcileImportedGroupId: number;
}

interface E2EPaths {
	tempRoot: string;
	preloadBundlePath: string;
	baseHtmlPath: string;
	appRendererHtmlPath: string;
	episodeStatusRendererHtmlPath: string;
	mediaWallStressHtmlPath: string;
}

interface E2ECommands {
	openWindow: (kind: "base" | "library" | "episode-status" | "media-wall-stress", options?: {
		search?: string;
		show?: boolean;
		width?: number;
		height?: number;
	}) => Promise<number>;
	destroyWindow: (windowId: number) => Promise<void>;
	destroyAllSecondaryWindows: () => Promise<void>;
	setWindowSize: (windowId: number, width: number, height: number) => void;
	getCanvasDiagnosticsRawSetting: () => string | null;
	prepareSafeReconcile: () => void;
	prepareAutomaticDownloadReconcileRollback: (fromVersion: string) => void;
	dropAutomaticDownloadReconcileFailureTrigger: () => void;
	getUserGroupContainsMedia: (groupId: number, mediaId: number) => boolean;
	getUserGroupingReconcileState: () => {
		lastReconciledAnimeDbVersion: string | null;
		lastReconcileStatus: string | null;
	};
	getMockAnimeDbReleaseDownloadCount: () => number;
	deleteImportedGroupLineage: () => number;
	getAnimeGroupExists: (groupId: number) => boolean;
	seedReleaseWatchRows: () => void;
	sendToasterMessage: (type: ToasterType, message: string) => void;
	installMockExternalTrackingFetch: () => void;
	installMockKitsuTrackingFetch: () => void;
	installMockKitsuXmlDialog: () => void;
	installMockExternalTrackingFetchFailure: (errorMessage: string) => void;
	installMockExternalTrackingPushFailure: (errorMessage: string) => void;
	installMockAnimeDbReleaseDownload: (version: string) => void;
	installMockAnimeDbReleaseDownloadFailure: (version: string, errorMessage: string) => void;
	prepareAnimeDbIncrementalUpdateMedia: (description: string) => void;
	appDataPathExists: () => boolean;
	getMainProcessDiagnostics: () => string[];
	clearMainProcessDiagnostics: () => void;
	closeDatabaseAndProviders: () => void;
}

interface E2EHost {
	ready: boolean;
	paths: E2EPaths;
	ids: E2EMediaIds;
	groupIds: E2EGroupIds;
	baseWindowId: number | null;
	commands: E2ECommands;
}

declare global {
	// Playwright evaluates command calls in Electron's main world; this is the
	// intentionally tiny test backdoor for setup-only actions that users cannot
	// perform through the renderer API.
	// eslint-disable-next-line no-var
	var __nimlatE2E: E2EHost | undefined;
}

interface E2EFixtureSnapshot {
	groupIds: E2EGroupIds;
}

const mainProcessDiagnostics: string[] = [];

function formatUnknownError(error: unknown): string {
	if (error instanceof Error) {
		return error.stack ?? error.message;
	}
	return String(error);
}

function recordMainProcessDiagnostic(label: string, error: unknown): void {
	mainProcessDiagnostics.push(`${ label }: ${ formatUnknownError(error) }`);
}

process.on(
	"uncaughtExceptionMonitor",
	(error) => {
		recordMainProcessDiagnostic(
			"uncaughtException",
			error,
		);
	},
);

process.on(
	"unhandledRejection",
	(reason) => {
		recordMainProcessDiagnostic(
			"unhandledRejection",
			reason,
		);
	},
);

app.on(
	"render-process-gone",
	(_event, _webContents, details) => {
		recordMainProcessDiagnostic(
			"render-process-gone",
			JSON.stringify(details),
		);
	},
);

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function getBootMode(): E2EBootMode {
	return process.env.NIMLAT_E2E_BOOT_MODE === "reuse"
		? "reuse"
		: "fresh";
}

function getTempRoot(): string {
	const configuredTempRoot = process.env.NIMLAT_E2E_TEMP_ROOT?.trim();
	if (configuredTempRoot) {
		return resolve(configuredTempRoot);
	}
	return mkdtempSync(join(
		tmpdir(),
		"nimlat-playwright-e2e-",
	));
}

function getFixtureSnapshotPath(tempRoot: string): string {
	return join(
		tempRoot,
		E2E_FIXTURE_SNAPSHOT_FILE,
	);
}

function readFixtureSnapshot(tempRoot: string): E2EFixtureSnapshot {
	const parsed = JSON.parse(readFileSync(
		getFixtureSnapshotPath(tempRoot),
		"utf8",
	)) as Partial<E2EFixtureSnapshot>;
	assert(
		typeof parsed.groupIds?.sourceGroupId === "number"
		&& typeof parsed.groupIds.targetGroupId === "number"
		&& typeof parsed.groupIds.libraryHideGroupId === "number"
		&& typeof parsed.groupIds.reconcileImportedGroupId === "number",
		"Expected reusable E2E fixture snapshot to contain group ids.",
	);
	return {
		groupIds: parsed.groupIds,
	};
}

function writeFixtureSnapshot(tempRoot: string, snapshot: E2EFixtureSnapshot): void {
	writeFileSync(
		getFixtureSnapshotPath(tempRoot),
		JSON.stringify(
			snapshot,
			null,
			2,
		),
	);
}

function computeFileSha256(filePath: string): string {
	return createHash("sha256")
		.update(readFileSync(filePath))
		.digest("hex");
}

function createJsonResponse(payload: unknown): Response {
	return new Response(
		JSON.stringify(payload),
		{
			status:  200,
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
}

function resolveFetchUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}
	if (input instanceof URL) {
		return input.toString();
	}
	return input.url;
}

function parseFetchJsonBody(init?: RequestInit): Record<string, unknown> {
	if (typeof init?.body !== "string") {
		return {};
	}
	try {
		return JSON.parse(init.body) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function createMedia(id: number, overrides: Partial<AniListMedia> = {}): AniListMedia {
	return {
		id,
		idMal:           id,
		title:           {
			english: `E2E Media ${ id }`,
			romaji:  `E2E Media ${ id }`,
			native:  `E2E Native ${ id }`,
		},
		type:            "ANIME",
		format:          "MOVIE",
		status:          "FINISHED",
		description:     `E2E description ${ id }`,
		startDate:       {
			year:  2024,
			month: 1,
			day:   1,
		},
		endDate:         {
			year:  2024,
			month: 3,
			day:   1,
		},
		season:          "WINTER",
		seasonYear:      2024,
		episodes:        1,
		countryOfOrigin: "JP",
		source:          "ORIGINAL",
		updatedAt:       Date.now(),
		coverImage:      {
			large:  E2E_IMAGE_DATA_URL,
			medium: E2E_IMAGE_DATA_URL,
			color:  "#224466",
		},
		bannerImage:     E2E_IMAGE_DATA_URL,
		averageScore:    80,
		meanScore:       81,
		popularity:      id,
		isAdult:         false,
		relations:       {
			edges: [],
		},
		characters:      {
			edges: [],
		},
		airingSchedule:  {
			nodes: [],
		},
		...overrides,
	};
}

function createEpisodes(): JikanEpisode[] {
	return [
		{
			mal_id:         1,
			url:            "https://example.com/e2e/episodes/1",
			title:          "E2E Episode 1",
			title_japanese: "E2E Episode 1 JP",
			title_romanji:  "E2E Episode 1 Romaji",
			aired:          "2024-01-01",
			score:          8.5,
			filler:         false,
			recap:          false,
			forum_url:      null,
		},
	];
}

function createEpisodeVideos(): JikanEpisodeVideo[] {
	return [
		{
			mal_id:  1,
			episode: "1",
			title:   "E2E Episode 1",
			url:     "https://example.com/e2e/videos/1",
			images:  {
				jpg: {
					image_url: E2E_IMAGE_DATA_URL,
				},
			},
		},
	];
}

function assertDb(db: Database.Database | null): Database.Database {
	assert(
		db !== null,
		"Expected E2E database to be initialized",
	);
	return db;
}

function checkpointAnimeDbForStandaloneCopy(db: Database.Database | null): void {
	// The mocked GitHub release copies only the main SQLite file. WAL pages must
	// be checkpointed first or the standalone asset can miss freshly initialized
	// schema/data and fail the same safety checks as a corrupt real download.
	assertDb(db).pragma("anime_data.wal_checkpoint(TRUNCATE)");
}

interface RendererHarnessBuildRequest {
	csp: string;
	entryFile: string;
	entryName: string;
	format: "esm" | "iife";
	htmlFileName: string;
	outDirName: string;
	tempRoot: string;
	title: string;
}

async function buildRendererHarness({
																			csp,
																			entryFile,
																			entryName,
																			format,
																			htmlFileName,
																			outDirName,
																			tempRoot,
																			title,
																		}: RendererHarnessBuildRequest): Promise<{ htmlPath: string }> {
	const rendererOutDir    = join(
		tempRoot,
		outDirName,
	);
	const rendererEntryPath = resolve(
		process.cwd(),
		"tools",
		"e2e",
		entryFile,
	);

	await build({
		entryPoints: [ rendererEntryPath ],
		outdir:      rendererOutDir,
		bundle:      true,
		platform:    "browser",
		format,
		tsconfig:    resolve(
			process.cwd(),
			"tsconfig.json",
		),
		logLevel:    "silent",
		loader:      {
			".css":        "css",
			".module.css": "local-css",
			".otf":        "file",
			".ttf":        "file",
		},
		entryNames:  entryName,
	});

	const htmlPath = join(
		tempRoot,
		htmlFileName,
	);
	writeFileSync(
		htmlPath,
		[
			"<!doctype html>",
			"<html lang=\"en\">",
			"<head>",
			"<meta charset=\"utf-8\" />",
			`<meta http-equiv="Content-Security-Policy" content="${ csp }" />`,
			`<link rel="stylesheet" href="./${ outDirName }/${ entryName }.css" />`,
			`<title>${ title }</title>`,
			"</head>",
			"<body>",
			"<div id=\"root\"></div>",
			`<script type="module" src="./${ outDirName }/${ entryName }.js"></script>`,
			"</body>",
			"</html>",
		].join(""),
	);

	return { htmlPath };
}

async function createHiddenWindow(
	preloadBundlePath: string,
	htmlPath: string,
	options?: {
		search?: string;
		show?: boolean;
		width?: number;
		height?: number;
	},
): Promise<BrowserWindow> {
	const window = new BrowserWindow({
		show:           false,
		width:          options?.width,
		height:         options?.height,
		webPreferences: {
			sandbox:          false,
			contextIsolation: true,
			nodeIntegration:  false,
			preload:          preloadBundlePath,
		},
	});
	await window.loadFile(
		htmlPath,
		options?.search ? { search: options.search } : undefined,
	);
	// Chromium can evaluate an unmapped window while its screenshot compositor remains unavailable
	// under Xvfb. Visual smoke tests opt in to mapping only the window they need to capture.
	if (options?.show) {
		window.show();
	}
	return window;
}

function waitForWindowClosed(window: BrowserWindow): Promise<void> {
	if (window.isDestroyed()) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		window.once(
			"closed",
			() => resolve(),
		);
		window.destroy();
	});
}

function rememberHarnessWindow(
	windows: Map<number, BrowserWindow>,
	window: BrowserWindow,
): BrowserWindow {
	// Electron windows must have a strong JS reference for their full lifetime.
	// Keeping only numeric IDs lets V8 collect the BrowserWindow wrapper and can
	// close a hidden harness window in the middle of a long serial E2E run.
	windows.set(
		window.id,
		window,
	);
	window.once(
		"closed",
		() => windows.delete(window.id),
	);
	return window;
}

async function initialize(): Promise<void> {
	const bootMode        = getBootMode();
	const tempRoot        = getTempRoot();
	const paths: E2EPaths = {
		tempRoot,
		preloadBundlePath:             join(
			tempRoot,
			"nimlat-e2e-preload.cjs",
		),
		baseHtmlPath:                  join(
			tempRoot,
			"nimlat-e2e.html",
		),
		appRendererHtmlPath:           "",
		episodeStatusRendererHtmlPath: "",
		mediaWallStressHtmlPath:       "",
	};

	app.commandLine.appendSwitch("disable-gpu");
	app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
	app.setPath(
		"appData",
		tempRoot,
	);
	app.setPath(
		"sessionData",
		join(
			tempRoot,
			"electron-session",
		),
	);
	app.setPath(
		"userData",
		join(
			tempRoot,
			"electron-user-data",
		),
	);
	mkdirSync(
		join(
			tempRoot,
			"Nimlat",
			"logs",
		),
		{ recursive: true },
	);
	mkdirSync(
		join(
			tempRoot,
			"Nimlat",
			"data",
		),
		{ recursive: true },
	);

	await app.whenReady();

	await build({
		entryPoints: [
			resolve(
				process.cwd(),
				"src",
				"preload",
				"preload.ts",
			),
		],
		outfile:     paths.preloadBundlePath,
		bundle:      true,
		platform:    "node",
		format:      "cjs",
		tsconfig:    resolve(
			process.cwd(),
			"tsconfig.json",
		),
		external:    [ "electron" ],
		logLevel:    "silent",
	});

	const rendererCsp                   = "default-src 'self'; connect-src 'self' https: data: blob: nimlat-image:; img-src 'self' https: data: blob: nimlat-image:; style-src 'self' 'unsafe-inline'; script-src 'self';";
	const localRendererCsp              = "default-src 'self'; connect-src 'self' data: blob: nimlat-image:; img-src 'self' data: blob: nimlat-image:; style-src 'self' 'unsafe-inline'; script-src 'self';";
	paths.appRendererHtmlPath           = (await buildRendererHarness({
		csp:          rendererCsp,
		entryFile:    "renderer-library-entry.tsx",
		entryName:    "full-app",
		format:       "iife",
		htmlFileName: "nimlat-e2e-app.html",
		outDirName:   "renderer-app",
		tempRoot,
		title:        "Nimlat Library E2E",
	})).htmlPath;
	paths.episodeStatusRendererHtmlPath = (await buildRendererHarness({
		csp:          rendererCsp,
		entryFile:    "renderer-episode-status-entry.tsx",
		entryName:    "episode-status",
		format:       "esm",
		htmlFileName: "nimlat-e2e-episode-status.html",
		outDirName:   "renderer-episode-status",
		tempRoot,
		title:        "Nimlat Episode Status E2E",
	})).htmlPath;
	paths.mediaWallStressHtmlPath       = (await buildRendererHarness({
		csp:          localRendererCsp,
		entryFile:    "renderer-media-wall-stress-entry.tsx",
		entryName:    "media-wall-stress",
		format:       "iife",
		htmlFileName: "nimlat-e2e-media-wall-stress.html",
		outDirName:   "renderer-media-wall-stress",
		tempRoot,
		title:        "Nimlat Media Wall Stress E2E",
	})).htmlPath;
	writeFileSync(
		paths.baseHtmlPath,
		[
			"<!doctype html>",
			"<html lang=\"en\">",
			"<head>",
			"<meta charset=\"utf-8\" />",
			`<meta http-equiv="Content-Security-Policy" content="${ localRendererCsp }" />`,
			"<title>Nimlat E2E</title>",
			"</head>",
			"<body>E2E</body>",
			"</html>",
		].join(""),
	);

	const require                       = createRequire(import.meta.url);
	const { installMockMediaProviders } = require("./mock-media-providers.ts");
	require("../../src/main/init/create-folders.ts");
	const {
					initDatabases,
					AnimeDbFacade,
					UserDbFacade,
				}                                = require("../../src/database/index.ts");
	const { registerIpcMainHandlers }      = require("../../src/main/ipc/index.ts");
	const {
					disposeAniListQueueEventsBridge,
					initAniListQueueEventsBridge,
				}                                = require("../../src/main/ipc/ani-list-queue-events-bridge.ts");
	const {
					disposeAnimeDbEventsBridge,
					initAnimeDbEventsBridge,
				}                                = require("../../src/main/ipc/anime-db-events-bridge.ts");
	const {
					disposeAppUpdateEventsBridge,
					initAppUpdateEventsBridge,
				}                                = require("../../src/main/ipc/app-update-events-bridge.ts");
	const {
					disposeConfigEventsBridge,
					initConfigEventsBridge,
				}                                = require("../../src/main/ipc/config-events-bridge.ts");
	const {
					disposeExternalTrackingEventsBridge,
					initExternalTrackingEventsBridge,
				}                                = require("../../src/main/ipc/external-tracking-events-bridge.ts");
	const {
					disposeGroupExplorerEventsBridge,
					initGroupExplorerEventsBridge,
				}                                = require("../../src/main/ipc/group-explorer-events-bridge.ts");
	const {
					disposeHydratorEventsBridge,
					initHydratorEventsBridge,
				}                                = require("../../src/main/ipc/hydrator-events-bridge.ts");
	const {
					disposeReleaseWatchEventsBridge,
					initReleaseWatchEventsBridge,
				}                                = require("../../src/main/ipc/release-watch-events-bridge.ts");
	const {
					disposeToasterEventsBridge,
					initToasterEventsBridge,
				}                                = require("../../src/main/ipc/toaster-events-bridge.ts");
	const {
					disposeImageCacheEvents,
					initImageCacheEvents,
				}                                = require("../../src/main/services/image-cache/image-cache-events.ts");
	const {
					BUS_ReleaseWatchPastListChanged,
					BUS_ReleaseWatchUpcomingListChanged,
				}                                = require("../../src/busses/main/index.ts");
	const { MediaProviderRegistry }        = require("../../src/main/providers/media-provider-registry.ts");
	const { GitHubRevisionsAPI }           = require("../../src/main/api/github-revisions-api.ts");
	const { PATH_ANIME_DB }                = require("../../src/constants/main/system-folders.ts");

	const ids: E2EMediaIds        = {
		baseMedia:               920001,
		relatedMedia:            920002,
		filmMedia:               920003,
		reconcileAddedMedia:     920007,
		reconcileGroupMedia:     920008,
		libraryHideMedia:        920009,
		missingMalMedia:         920010,
		noThumbnailMedia:        920011,
		missingJikanMedia:       920012,
		offlineEpisodeMedia:     920013,
		transientFailureMedia:   920014,
		releaseWatchUpcomingMedia:    920015,
		animeDbUpdateMedia:      920016,
		reconcileRollbackFirstMedia:  920017,
		reconcileRollbackSecondMedia: 920018,
	};
	const baseMedia               = createMedia(
		ids.baseMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Old description before refresh",
		},
	);
	const relatedMedia            = createMedia(ids.relatedMedia);
	const filmMedia               = createMedia(ids.filmMedia);
	const reconcileAddedMedia     = createMedia(ids.reconcileAddedMedia);
	const reconcileGroupMedia     = createMedia(ids.reconcileGroupMedia);
	const reconcileRollbackFirstMedia = createMedia(ids.reconcileRollbackFirstMedia);
	const reconcileRollbackSecondMedia = createMedia(ids.reconcileRollbackSecondMedia);
	const libraryHideMedia        = createMedia(ids.libraryHideMedia);
	const missingMalMedia         = createMedia(
		ids.missingMalMedia,
		{
			idMal:       null,
			format:      "TV",
			episodes:    12,
			description: "Missing MAL mapping media",
		},
	);
	const noThumbnailMedia        = createMedia(
		ids.noThumbnailMedia,
		{
			format:      "TV",
			episodes:    2,
			description: "Media with Jikan episodes but no thumbnails",
		},
	);
	const missingJikanMedia       = createMedia(
		ids.missingJikanMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Media with unsupported Jikan episodes resource",
		},
	);
	const offlineEpisodeMedia     = createMedia(
		ids.offlineEpisodeMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Media queued for episode refresh while offline",
		},
	);
	const transientFailureMedia   = createMedia(
		ids.transientFailureMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Media with transient Jikan episode failure",
		},
	);
	const releaseWatchUpcomingMedia = createMedia(
		ids.releaseWatchUpcomingMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Upcoming Release Watch fixture",
		},
	);
	const refreshedBaseMedia      = createMedia(
		ids.baseMedia,
		{
			format:      "TV",
			episodes:    12,
			description: "Refreshed description from mocked provider",
		},
	);

	const fullMediasById  = new Map<number, AniListMedia>([
		[
			ids.baseMedia,
			refreshedBaseMedia,
		],
		[
			ids.relatedMedia,
			relatedMedia,
		],
	]);
	const episodesByMalId = new Map<number, { episodes: JikanEpisode[]; videos: JikanEpisodeVideo[] }>([
		[
			ids.baseMedia,
			{
				episodes: createEpisodes(),
				videos:   createEpisodeVideos(),
			},
		],
	]);
	installMockMediaProviders({
		fullMediasById,
		episodesByMalId,
	});

	let db: Database.Database | null = initDatabases();
	registerIpcMainHandlers();
	initImageCacheEvents();
	initAnimeDbEventsBridge();
	initAppUpdateEventsBridge();
	initAniListQueueEventsBridge();
	initGroupExplorerEventsBridge();
	initExternalTrackingEventsBridge();
	initConfigEventsBridge();
	initHydratorEventsBridge();
	initReleaseWatchEventsBridge();
	initToasterEventsBridge();
	let restoreExternalTrackingFetchMock: (() => void) | null = null;
	let restoreKitsuXmlDialogMock: (() => void) | null = null;
	let restoreGitHubRevisionsMock: (() => void) | null       = null;
	let animeDbReleaseDownloadCount = 0;

	let groupIds: E2EGroupIds;
	if (bootMode === "fresh") {
		for (const media of [
			baseMedia,
			relatedMedia,
			filmMedia,
			libraryHideMedia,
			missingMalMedia,
			noThumbnailMedia,
			missingJikanMedia,
			offlineEpisodeMedia,
			transientFailureMedia,
			releaseWatchUpcomingMedia,
		]) {
			AnimeDbFacade.media.upsertMedia(media);
		}
		assertDb(db).prepare(`
        UPDATE anime_data.media
        SET lastUpdatedAt = ?
        WHERE mediaId IN (?, ?, ?)
		`).run(
			Date.now() - (15 * 60 * 1000),
			ids.baseMedia,
			ids.relatedMedia,
			ids.filmMedia,
		);

		const sourceGroupId        = AnimeDbFacade.group.create(
			{
				baseMediaId: ids.baseMedia,
				name:        "E2E Source Group",
				description: "E2E source group description",
				imageUrl:    E2E_IMAGE_DATA_URL,
			},
			[ ids.baseMedia ],
		);
		const targetGroupId        = AnimeDbFacade.group.create(
			{
				baseMediaId: ids.relatedMedia,
				name:        "E2E Target Group",
				description: "E2E target group description",
				imageUrl:    E2E_IMAGE_DATA_URL,
			},
			[ ids.relatedMedia ],
		);
		const libraryHideGroupId   = AnimeDbFacade.group.create(
			{
				baseMediaId: ids.libraryHideMedia,
				name:        "E2E Library Hide Group",
				description: "E2E official group for mounted Library action coverage",
				imageUrl:    E2E_IMAGE_DATA_URL,
			},
			[ ids.libraryHideMedia ],
		);
		const noThumbnailSyncState = AnimeDbFacade.getOrCreateJikanEpisodesSyncState(ids.noThumbnailMedia);
		AnimeDbFacade.upsertJikanEpisodesStagingPage(
			ids.noThumbnailMedia,
			noThumbnailSyncState.syncRunId,
			createEpisodes(),
		);
		AnimeDbFacade.finalizeJikanEpisodesSync(
			ids.noThumbnailMedia,
			noThumbnailSyncState.syncRunId,
		);
		AnimeDbFacade.deleteFromGroupJikanEpisodesQueue(ids.noThumbnailMedia);
		AnimeDbFacade.retryMediaEpisodeUpdates(ids.missingJikanMedia);
		AnimeDbFacade.markFailedGroupJikanEpisodesQueue(
			ids.missingJikanMedia,
			"Jikan episodes resource missing",
			"jikan_resource_unavailable",
		);
		AnimeDbFacade.retryMediaEpisodeUpdates(ids.offlineEpisodeMedia);
		AnimeDbFacade.retryMediaEpisodeUpdates(ids.transientFailureMedia);
		AnimeDbFacade.markFailedGroupJikanEpisodesQueue(
			ids.transientFailureMedia,
			"Temporary mocked Jikan failure",
			"transient_failure",
		);

		groupIds = {
			sourceGroupId,
			targetGroupId,
			libraryHideGroupId,
			reconcileImportedGroupId: 0,
		};
		writeFixtureSnapshot(
			tempRoot,
			{ groupIds },
		);
	} else {
		// Reuse boot is a real app restart over the same SQLite files; fixtures must
		// not be reseeded or persistence regressions can be hidden by duplicate setup.
		groupIds = readFixtureSnapshot(tempRoot).groupIds;
	}
	const harnessWindows     = new Map<number, BrowserWindow>();
	const secondaryWindowIds = new Set<number>();

	const baseWindow = rememberHarnessWindow(
		harnessWindows,
		await createHiddenWindow(
			paths.preloadBundlePath,
			paths.baseHtmlPath,
		),
	);

	const commands: E2ECommands = {
		openWindow:                               async (kind, options) => {
			const htmlByKind = {
				base:                paths.baseHtmlPath,
				library:             paths.appRendererHtmlPath,
				"episode-status":    paths.episodeStatusRendererHtmlPath,
				"media-wall-stress": paths.mediaWallStressHtmlPath,
			} satisfies Record<typeof kind, string>;
			const window     = rememberHarnessWindow(
				harnessWindows,
				await createHiddenWindow(
					paths.preloadBundlePath,
					htmlByKind[ kind ],
					options,
				),
			);
			secondaryWindowIds.add(window.id);
			return window.id;
		},
		destroyWindow:                            async (windowId) => {
			assert(
				windowId !== baseWindow.id,
				"E2E destroyWindow must not close the persistent base harness window.",
			);
			const window = harnessWindows.get(windowId) ?? BrowserWindow.fromId(windowId);
			if (window && !window.isDestroyed()) {
				await waitForWindowClosed(window);
			}
			secondaryWindowIds.delete(windowId);
		},
		destroyAllSecondaryWindows:               async () => {
			const closeOperations: Array<Promise<void>> = [];
			for (const windowId of secondaryWindowIds) {
				const window = harnessWindows.get(windowId) ?? BrowserWindow.fromId(windowId);
				if (window && !window.isDestroyed()) {
					closeOperations.push(waitForWindowClosed(window));
				}
			}
			await Promise.all(closeOperations);
			secondaryWindowIds.clear();
		},
		setWindowSize:                            (windowId, width, height) => {
			const window = BrowserWindow.fromId(windowId);
			assert(
				window && !window.isDestroyed(),
				"Expected target window for resize",
			);
			window.setSize(
				width,
				height,
			);
		},
		getCanvasDiagnosticsRawSetting:           () => {
			const row = assertDb(db)
				.prepare<[ string ], { settingValue: string | null }>(`
            SELECT settingValue
            FROM config
            WHERE settingKey = ?
				`)
				.get(KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED);
			return row?.settingValue ?? null;
		},
		prepareSafeReconcile:                     () => {
			UserDbFacade.config.setAnimeDbVersion("e2e-v1");
			UserDbFacade.grouping.forkAnimeGroupingToSnapshot();
			AnimeDbFacade.media.upsertMedia(reconcileAddedMedia);
			AnimeDbFacade.media.upsertMedia(reconcileGroupMedia);
			AnimeDbFacade.group.assignMediasToGroup(
				groupIds.sourceGroupId,
				[ ids.reconcileAddedMedia ],
				true,
			);
			groupIds.reconcileImportedGroupId = AnimeDbFacade.group.create(
				{
					baseMediaId: ids.reconcileGroupMedia,
					name:        "E2E Reconcile Imported Group",
					description: "Imported through safe reconcile apply",
					imageUrl:    E2E_IMAGE_DATA_URL,
				},
				[ ids.reconcileGroupMedia ],
			);
			UserDbFacade.config.setAnimeDbVersion("e2e-v2");
		},
		prepareAutomaticDownloadReconcileRollback:    (fromVersion) => {
			// The trigger is connection-local: it injects a real SQLite failure without
			// persisting test-only schema into the user database fixture.
			assertDb(db).exec("DROP TRIGGER IF EXISTS temp.e2e_reconcile_second_import_failure");
			UserDbFacade.grouping.resetToAnimeGrouping();
			UserDbFacade.config.setAnimeDbVersion(fromVersion);
			UserDbFacade.grouping.forkAnimeGroupingToSnapshot();
			AnimeDbFacade.media.upsertMedia(reconcileRollbackFirstMedia);
			AnimeDbFacade.media.upsertMedia(reconcileRollbackSecondMedia);
			AnimeDbFacade.group.assignMediasToGroup(
				groupIds.sourceGroupId,
				[ ids.reconcileRollbackFirstMedia ],
				true,
			);
			AnimeDbFacade.group.assignMediasToGroup(
				groupIds.targetGroupId,
				[ ids.reconcileRollbackSecondMedia ],
				true,
			);
			assertDb(db).exec(`
				CREATE TEMP TRIGGER e2e_reconcile_second_import_failure
				BEFORE INSERT ON userGroupMedias
				WHEN NEW.mediaId = ${ ids.reconcileRollbackSecondMedia }
				BEGIN
					SELECT RAISE(ABORT, 'E2E forced second reconcile import failure');
				END
			`);
		},
		dropAutomaticDownloadReconcileFailureTrigger: () => {
			assertDb(db).exec("DROP TRIGGER IF EXISTS temp.e2e_reconcile_second_import_failure");
		},
		getUserGroupContainsMedia:                    (groupId, mediaId) => {
			const row = assertDb(db).prepare<[ number, number ], { found: 1 }>(`
          SELECT 1 AS found
          FROM userGroupMedias
          WHERE groupId = ?
            AND mediaId = ?
          LIMIT 1
			`).get(
				groupId,
				mediaId,
			);
			return row?.found === 1;
		},
		getUserGroupingReconcileState:                () => {
			const state = UserDbFacade.grouping.getState();
			return {
				lastReconciledAnimeDbVersion: state.lastReconciledAnimeDbVersion ?? null,
				lastReconcileStatus:          state.lastReconcileStatus ?? null,
			};
		},
		getMockAnimeDbReleaseDownloadCount:           () => animeDbReleaseDownloadCount,
		deleteImportedGroupLineage:               () => {
			const row = assertDb(db).prepare<[ number ], { groupLineageId: number }>(`
          SELECT groupLineageId
          FROM userGroupLineages
          WHERE userGroupId = ?
          LIMIT 1
			`).get(groupIds.reconcileImportedGroupId);
			assert(
				typeof row?.groupLineageId === "number",
				"Expected imported user group to expose a restorable lineage id",
			);
			assertDb(db).prepare<[ number ]>(`
          DELETE
          FROM userGroups
          WHERE id = ?
			`).run(groupIds.reconcileImportedGroupId);
			assertDb(db).prepare<[ number, number ]>(`
          UPDATE userGroupLineages
          SET userGroupId        = NULL,
              status             = 'deleted',
              lastUserModifiedAt = ?
          WHERE groupLineageId = ?
			`).run(
				Date.now(),
				row.groupLineageId,
			);
			return row.groupLineageId;
		},
		getAnimeGroupExists:                      (groupId) => AnimeDbFacade.group.getInspectionSummary(groupId) !== null,
		seedReleaseWatchRows:                     () => {
			const now                                     = Date.now();
			const pastState: UserReleaseWatchStateDto     = {
				mediaId:              ids.baseMedia,
				watchDomain:          "past",
				state:                "released_needs_integration",
				resolvedReleaseAt:    now - 60_000,
				releaseDatePrecision: "timestamp",
				releaseDateSource:    "provider_release_at",
				payloadJson:          JSON.stringify({ message: "E2E past release" }),
				updatedAt:            now,
			};
			const upcomingState: UserReleaseWatchStateDto = {
				mediaId: ids.releaseWatchUpcomingMedia,
				watchDomain:          "upcoming",
				state:                "upcoming_media_release",
				resolvedReleaseAt:    now + 60_000,
				releaseDatePrecision: "timestamp",
				releaseDateSource:    "media_start_date",
				payloadJson:          JSON.stringify({ message: "E2E upcoming release" }),
				updatedAt:            now,
			};
			UserDbFacade.releaseWatch.replaceInterestMedia([
				{
					mediaId:       ids.baseMedia,
					sourceMediaId: ids.baseMedia,
					reason:        "tracked",
					updatedAt:     now,
				},
				{
					mediaId: ids.releaseWatchUpcomingMedia,
					sourceMediaId: ids.baseMedia,
					reason:        "related",
					updatedAt:     now,
				},
			]);
			UserDbFacade.releaseWatch.saveState(pastState);
			UserDbFacade.releaseWatch.saveState(upcomingState);
			BUS_ReleaseWatchPastListChanged.next({ affectedMediaIds: [ ids.baseMedia ] });
			BUS_ReleaseWatchUpcomingListChanged.next({ affectedMediaIds: [ ids.releaseWatchUpcomingMedia ] });
		},
		sendToasterMessage:                       (type, message) => {
			switch (type) {
				case ToasterType.SUCCESS:
					Toaster.success(message);
					return;
				case ToasterType.ERROR:
					Toaster.error(message);
					return;
				case ToasterType.INFO:
					Toaster.info(message);
					return;
			}
		},
		installMockExternalTrackingFetch:         () => {
			restoreExternalTrackingFetchMock?.();
			const originalFetch              = globalThis.fetch.bind(globalThis);
			globalThis.fetch                 = async (input, init) => {
				const url = resolveFetchUrl(input);
				if (url !== "https://graphql.anilist.co") {
					return originalFetch(
						input,
						init,
					);
				}
				const body  = parseFetchJsonBody(init);
				const query = String(body.query ?? "");
				if (query.includes("Viewer")) {
					return createJsonResponse({
						data: {
							Viewer: {
								id: 9200,
							},
						},
					});
				}
				if (query.includes("mediaList")) {
					return createJsonResponse({
						data: {
							Page: {
								pageInfo:  {
									hasNextPage: false,
								},
								mediaList: [
									{
										mediaId:   ids.relatedMedia,
										status:    "COMPLETED",
										progress:  1,
										updatedAt: Math.floor(Date.now() / 1000),
										media:     {
											id:       ids.relatedMedia,
											episodes: 1,
											idMal:    ids.relatedMedia,
										},
									},
								],
							},
						},
					});
				}
				if (query.includes("SaveMediaListEntry")) {
					return createJsonResponse({
						data: {
							SaveMediaListEntry: {
								id: 1,
							},
						},
					});
				}
				throw new Error(`Unexpected mocked AniList GraphQL query: ${ query.slice(
					0,
					120,
				) }`);
			};
			restoreExternalTrackingFetchMock = () => {
				globalThis.fetch                 = originalFetch;
				restoreExternalTrackingFetchMock = null;
			};
		},
		installMockKitsuTrackingFetch:                () => {
			restoreExternalTrackingFetchMock?.();
			const originalFetch              = globalThis.fetch.bind(globalThis);
			globalThis.fetch                 = async (input, init) => {
				const url = resolveFetchUrl(input);
				if (url === "https://kitsu.io/api/oauth/token") {
					const body = init?.body as URLSearchParams;
					if (body.get("grant_type") !== "password"
						|| body.get("username") !== "e2e-kitsu@example.com"
						|| body.get("password") !== "e2e-kitsu-password") {
						throw new Error("Unexpected mocked Kitsu password grant payload.");
					}
					return createJsonResponse({
						access_token:  "e2e-kitsu-access",
						refresh_token: "e2e-kitsu-refresh",
						expires_in:    3600,
					});
				}
				if (url.startsWith("https://kitsu.io/api/edge/users?")) {
					return createJsonResponse({
						data: [
							{
								type: "users",
								id:   "9200",
							},
						],
					});
				}
				if (url.startsWith("https://kitsu.io/api/edge/library-entries?")) {
					return createJsonResponse({
						data:     [
							{
								type:          "libraryEntries",
								id:            "9201",
								attributes:    {
									status:       "completed",
									progress:     1,
									progressedAt: new Date().toISOString(),
								},
								relationships: {
									anime: {
										data: {
											type: "anime",
											id:   "9202",
										},
									},
								},
							},
						],
						included: [
							{
								type:          "anime",
								id:            "9202",
								attributes:    { episodeCount: 1 },
								relationships: {
									mappings: {
										data: [
											{
												type: "mappings",
												id:   "9203",
											},
										],
									},
								},
							},
							{
								type:       "mappings",
								id:         "9203",
								attributes: {
									externalSite: "anilist/anime",
									externalId:   ids.missingMalMedia.toString(),
								},
							},
						],
						links:    { next: null },
					});
				}
				return originalFetch(
					input,
					init,
				);
			};
			restoreExternalTrackingFetchMock = () => {
				globalThis.fetch                 = originalFetch;
				restoreExternalTrackingFetchMock = null;
			};
		},
		installMockKitsuXmlDialog:                    () => {
			restoreKitsuXmlDialogMock?.();
			const xmlPath            = join(
				tempRoot,
				"e2e-kitsu-anime.xml",
			);
			const originalShowDialog = dialog.showOpenDialog.bind(dialog);
			writeFileSync(
				xmlPath,
				`<myanimelist><anime>
					<series_animedb_id>${ ids.baseMedia }</series_animedb_id>
					<my_watched_episodes>1</my_watched_episodes>
					<my_status>Completed</my_status>
				</anime></myanimelist>`,
				"utf8",
			);
			dialog.showOpenDialog     = (async () => ({
				canceled:  false,
				filePaths: [ xmlPath ],
			})) as typeof dialog.showOpenDialog;
			restoreKitsuXmlDialogMock = () => {
				dialog.showOpenDialog     = originalShowDialog;
				restoreKitsuXmlDialogMock = null;
			};
		},
		installMockExternalTrackingFetchFailure:  (errorMessage) => {
			restoreExternalTrackingFetchMock?.();
			const originalFetch              = globalThis.fetch.bind(globalThis);
			globalThis.fetch                 = async (input, init) => {
				const url = resolveFetchUrl(input);
				if (url !== "https://graphql.anilist.co") {
					return originalFetch(
						input,
						init,
					);
				}
				const body  = parseFetchJsonBody(init);
				const query = String(body.query ?? "");
				if (query.includes("Viewer")) {
					return createJsonResponse({
						data: {
							Viewer: {
								id: 9200,
							},
						},
					});
				}
				if (query.includes("mediaList")) {
					throw new Error(errorMessage);
				}
				if (query.includes("SaveMediaListEntry")) {
					return createJsonResponse({
						data: {
							SaveMediaListEntry: {
								id: 1,
							},
						},
					});
				}
				throw new Error(`Unexpected mocked AniList GraphQL query: ${ query.slice(
					0,
					120,
				) }`);
			};
			restoreExternalTrackingFetchMock = () => {
				globalThis.fetch                 = originalFetch;
				restoreExternalTrackingFetchMock = null;
			};
		},
		installMockExternalTrackingPushFailure:   (errorMessage) => {
			restoreExternalTrackingFetchMock?.();
			const originalFetch              = globalThis.fetch.bind(globalThis);
			globalThis.fetch                 = async (input, init) => {
				const url = resolveFetchUrl(input);
				if (url !== "https://graphql.anilist.co") {
					return originalFetch(
						input,
						init,
					);
				}
				const body  = parseFetchJsonBody(init);
				const query = String(body.query ?? "");
				if (query.includes("Viewer")) {
					return createJsonResponse({
						data: {
							Viewer: {
								id: 9200,
							},
						},
					});
				}
				if (query.includes("mediaList")) {
					return createJsonResponse({
						data: {
							Page: {
								pageInfo:  {
									hasNextPage: false,
								},
								mediaList: [],
							},
						},
					});
				}
				if (query.includes("SaveMediaListEntry")) {
					throw new Error(errorMessage);
				}
				throw new Error(`Unexpected mocked AniList GraphQL query: ${ query.slice(
					0,
					120,
				) }`);
			};
			restoreExternalTrackingFetchMock = () => {
				globalThis.fetch                 = originalFetch;
				restoreExternalTrackingFetchMock = null;
			};
		},
		installMockAnimeDbReleaseDownload:        (version) => {
			restoreGitHubRevisionsMock?.();
			animeDbReleaseDownloadCount                   = 0;
			const originalListAnimeDbRevisions       = GitHubRevisionsAPI.listAnimeDbRevisions;
			const originalStreamReleaseAssetDownload = GitHubRevisionsAPI.streamReleaseAssetDownload;
			checkpointAnimeDbForStandaloneCopy(db);
			const checksumSha256                          = computeFileSha256(PATH_ANIME_DB);
			GitHubRevisionsAPI.listAnimeDbRevisions       = async () => ({
				revisions:   [
					{
						id:           9200,
						tagName:      version,
						name:         `E2E AnimeDB ${ version }`,
						createdAt:    new Date().toISOString(),
						publishedAt:  new Date().toISOString(),
						isDraft:      false,
						isPrerelease: false,
						assets:       [
							{
								id:          9201,
								name:        "anime_data.db",
								size:        statSync(PATH_ANIME_DB).size,
								contentType: "application/vnd.sqlite3",
								downloadUrl: "https://example.test/nimlat-e2e/anime_data.db",
								createdAt:   new Date().toISOString(),
								updatedAt:   new Date().toISOString(),
								sha256:      checksumSha256,
							},
						],
					},
				],
				page:        1,
				perPage:     100,
				hasNextPage: false,
				nextPage:    null,
			});
			GitHubRevisionsAPI.streamReleaseAssetDownload = (options: DownloadReleaseAssetOptions) => new Observable((subscriber) => {
				animeDbReleaseDownloadCount += 1;
				checkpointAnimeDbForStandaloneCopy(db);
				const fixtureBytes = statSync(PATH_ANIME_DB).size;
				subscriber.next({
					kind:     "progress",
					progress: {
						receivedBytes:       0,
						totalBytes:          fixtureBytes,
						percent:             0,
						speedBytesPerSecond: null,
						etaSeconds:          null,
					},
				});
				copyFileSync(
					PATH_ANIME_DB,
					options.destinationPath,
				);
				const totalBytes = statSync(options.destinationPath).size;
				subscriber.next({
					kind:     "progress",
					progress: {
						receivedBytes:       totalBytes,
						totalBytes,
						percent:             1,
						speedBytesPerSecond: null,
						etaSeconds:          0,
					},
				});
				subscriber.next({
					kind:   "completed",
					result: {
						destinationPath: options.destinationPath,
						totalBytes,
					},
				});
				subscriber.complete();
			});
			restoreGitHubRevisionsMock                    = () => {
				GitHubRevisionsAPI.listAnimeDbRevisions       = originalListAnimeDbRevisions;
				GitHubRevisionsAPI.streamReleaseAssetDownload = originalStreamReleaseAssetDownload;
				restoreGitHubRevisionsMock                    = null;
			};
		},
		installMockAnimeDbReleaseDownloadFailure: (version, errorMessage) => {
			restoreGitHubRevisionsMock?.();
			const originalListAnimeDbRevisions       = GitHubRevisionsAPI.listAnimeDbRevisions;
			const originalStreamReleaseAssetDownload = GitHubRevisionsAPI.streamReleaseAssetDownload;
			checkpointAnimeDbForStandaloneCopy(db);
			const checksumSha256                          = computeFileSha256(PATH_ANIME_DB);
			GitHubRevisionsAPI.listAnimeDbRevisions       = async () => ({
				revisions:   [
					{
						id:           9300,
						tagName:      version,
						name:         `E2E AnimeDB failed ${ version }`,
						createdAt:    new Date().toISOString(),
						publishedAt:  new Date().toISOString(),
						isDraft:      false,
						isPrerelease: false,
						assets:       [
							{
								id:          9301,
								name:        "anime_data.db",
								size:        statSync(PATH_ANIME_DB).size,
								contentType: "application/vnd.sqlite3",
								downloadUrl: "https://example.test/nimlat-e2e/anime_data.db",
								createdAt:   new Date().toISOString(),
								updatedAt:   new Date().toISOString(),
								sha256:      checksumSha256,
							},
						],
					},
				],
				page:        1,
				perPage:     100,
				hasNextPage: false,
				nextPage:    null,
			});
			GitHubRevisionsAPI.streamReleaseAssetDownload = () => new Observable((subscriber) => {
				const fixtureBytes = statSync(PATH_ANIME_DB).size;
				subscriber.next({
					kind:     "progress",
					progress: {
						receivedBytes:       0,
						totalBytes:          fixtureBytes,
						percent:             0,
						speedBytesPerSecond: null,
						etaSeconds:          null,
					},
				});
				// The failure happens before a completed asset event, so the downloader
				// must not verify/promote the temp file or mutate the installed version.
				subscriber.error(new Error(errorMessage));
			});
			restoreGitHubRevisionsMock                    = () => {
				GitHubRevisionsAPI.listAnimeDbRevisions       = originalListAnimeDbRevisions;
				GitHubRevisionsAPI.streamReleaseAssetDownload = originalStreamReleaseAssetDownload;
				restoreGitHubRevisionsMock                    = null;
			};
		},
		prepareAnimeDbIncrementalUpdateMedia:     (description) => {
			// The update E2E starts from an expired completed cursor so it cannot be
			// hidden by the production cooldown for recently completed catalog refreshes.
			AnimeDbFacade.scanState.saveAnimeDbUpdateState({
				version:                         1,
				lastSuccessfulProviderUpdatedAt: null,
				lastKnownTailPage:               1,
				lastSuccessfulRunCompletedAt:    Date.now() - (48 * 60 * 60 * 1000),
				lastRunStatus:                   "completed",
				startedAt:                       null,
				errorMessage:                    null,
				updatedAt:                       Date.now(),
			});
			fullMediasById.set(
				ids.animeDbUpdateMedia,
				createMedia(
					ids.animeDbUpdateMedia,
					{
						description,
						updatedAt: Date.now(),
					},
				),
			);
		},
		appDataPathExists:                        () => existsSync(app.getPath("appData")),
		getMainProcessDiagnostics:                () => [ ...mainProcessDiagnostics ],
		clearMainProcessDiagnostics:              () => {
			mainProcessDiagnostics.length = 0;
		},
		closeDatabaseAndProviders:                () => {
			restoreExternalTrackingFetchMock?.();
			restoreKitsuXmlDialogMock?.();
			restoreGitHubRevisionsMock?.();
			disposeAnimeDbEventsBridge();
			disposeAppUpdateEventsBridge();
			disposeAniListQueueEventsBridge();
			disposeGroupExplorerEventsBridge();
			disposeExternalTrackingEventsBridge();
			disposeConfigEventsBridge();
			disposeHydratorEventsBridge();
			disposeReleaseWatchEventsBridge();
			disposeToasterEventsBridge();
			disposeImageCacheEvents();
			MediaProviderRegistry.resetAll();
			if (db) {
				db.close();
				db = null;
			}
		},
	};

	globalThis.__nimlatE2E = {
		ready:        true,
		paths,
		ids,
		groupIds,
		baseWindowId: baseWindow.id,
		commands,
	};
}

initialize().catch((error) => {
	process.stderr.write(`[playwright-e2e] failed to initialize: ${ error instanceof Error
		? error.stack ?? error.message
		: String(error) }\n`);
	app.exit(1);
});
