import type Database from "better-sqlite3";
import { app } from "electron";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
	join,
	resolve,
} from "node:path";
import type { AniListMedia } from "../../src/shared/types/ani-list-media-api";
import type {
	ReconcileApplyExecutionResult,
	ReconcileConflictRecordPayload,
	ReconcileLineageItem,
	ReconcilePreflightSummary,
	UserMediaOverrideRowDto,
	UserReleaseWatchStateDto,
	UserScheduledMediaRefreshDto,
} from "../../src/shared/types/anime-db";
import type {
	ErroredContentItem,
	GroupMediaWallRange,
	LibraryDisplayItem,
	MediaInspectionData,
} from "../../src/shared/types/ipc-payloads";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "../../src/shared/types/jikan-api";
import { assertSchemaSnapshot } from "./db-schema-snapshot";

// Fail fast at the first broken smoke invariant. Explicit assertions keep DB
// bootstrap and critical facade expectations readable during schema refactors.
function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

// Narrow fixture reads once so individual checks describe expected state instead
// of repeating null-handling mechanics.
function assertPresent<T>(value: T | null | undefined, message: string): asserts value is T {
	assert(
		value != null,
		message,
	);
}

// Suppression checks care specifically about official Group rows; raw media and
// user-owned Groups with the same ids are separate library items.
function hasNoOfficialGroupRow(items: LibraryDisplayItem[], groupId: number): boolean {
	return !items.some((item) =>
		item.kind === "group"
		&& item.group?.source === "official"
		&& item.group.groupId === groupId);
}

const RUN_LOG_PATH = resolve(
	process.cwd(),
	"tools",
	"smoke",
	".last-run.log",
);

function logStage(message: string): void {
	appendFileSync(
		RUN_LOG_PATH,
		`${ new Date().toISOString() } ${ message }\n`,
	);
}

function runCheck(name: string, check: () => void): void {
	logStage(`check:start ${ name }`);
	check();
	logStage(`check:ok ${ name }`);
}

async function runCheckAsync(name: string, check: () => Promise<void>): Promise<void> {
	logStage(`check:start ${ name }`);
	await check();
	logStage(`check:ok ${ name }`);
}

function createSmokeMedia(id: number, relatedId?: number): AniListMedia {
	return {
		id,
		idMal:           id,
		title:           {
			english: `Smoke Media ${ id }`,
			romaji:  `Smoke Media ${ id }`,
			native:  `Smoke Native ${ id }`,
		},
		type:            "ANIME",
		format:          relatedId ? "TV" : "MOVIE",
		status:          "FINISHED",
		description:     `Smoke description ${ id }`,
		startDate:       {
			year:  2024,
			month: 1,
			day:   1,
		},
		endDate:         {
			year:  2024,
			month: 3,
			day:   31,
		},
		season:          "WINTER",
		seasonYear:      2024,
		episodes:        relatedId ? 12 : 1,
		countryOfOrigin: "JP",
		source:          "MANGA",
		updatedAt:       Date.now(),
		coverImage:      {
			large:  `https://example.com/media-${ id }.jpg`,
			medium: `https://example.com/media-${ id }-medium.jpg`,
			color:  "#123456",
		},
		bannerImage:     `https://example.com/banner-${ id }.jpg`,
		averageScore:    80,
		meanScore:      81,
		popularity:     1000 + id,
		isAdult:        false,
		relations:      relatedId
											? {
				edges: [
					{
						id:           id * 1000 + relatedId,
						relationType: "SEQUEL",
						node:         {
							id:                relatedId,
							idMal:             relatedId,
							title:             {
								english: `Smoke Media ${ relatedId }`,
								romaji:  `Smoke Media ${ relatedId }`,
								native:  `Smoke Native ${ relatedId }`,
							},
							description:       `Related smoke description ${ relatedId }`,
							coverImage:        {
								large:  `https://example.com/media-${ relatedId }.jpg`,
								medium: `https://example.com/media-${ relatedId }-medium.jpg`,
								color:  "#654321",
							},
							status:            "FINISHED",
							episodes:          1,
							nextAiringEpisode: null,
							isAdult:           false,
							format:            "MOVIE",
						},
					},
				],
			}
											 : {
				edges: [],
			},
		characters:     {
			edges: [],
		},
		airingSchedule: {
			nodes: [],
		},
	};
}

function createSmokeEpisodes(): JikanEpisode[] {
	return [
		{
			mal_id:         1,
			url:            "https://example.com/episodes/1",
			title:          "Smoke Episode 1",
			title_japanese: "Smoke Episode 1 JP",
			title_romanji:  "Smoke Episode 1 Romaji",
			aired:          "2024-01-01",
			score:          8.5,
			filler:         false,
			recap:          false,
			forum_url:      null,
		},
		{
			mal_id:         2,
			url:            "https://example.com/episodes/2",
			title:          "Smoke Episode 2",
			title_japanese: "Smoke Episode 2 JP",
			title_romanji:  "Smoke Episode 2 Romaji",
			aired:          "2024-01-08",
			score:          8.0,
			filler:         false,
			recap:          false,
			forum_url:      null,
		},
	];
}

function createSmokeEpisodeVideos(): JikanEpisodeVideo[] {
	return [
		{
			mal_id:  1,
			episode: "1",
			title:   "Smoke Episode 1",
			url:     "https://example.com/videos/1",
			images:  {
				jpg: {
					image_url: "https://example.com/thumb-1.jpg",
				},
			},
		},
		{
			mal_id:  2,
			episode: "2",
			title:   "Smoke Episode 2",
			url:     "https://example.com/videos/2",
			images:  {
				jpg: {
					image_url: "https://example.com/thumb-2.jpg",
				},
			},
		},
	];
}

function assertTableExists(db: Database.Database, databaseName: string, tableName: string): void {
	const row = db.prepare<
		[ string ],
		{ name: string }
	>(`
      SELECT name
      FROM ${ databaseName }.sqlite_master
      WHERE type = 'table'
        AND name = ?
	`).get(tableName);

	assert(
		row?.name === tableName,
		`Expected table ${ databaseName }.${ tableName } to exist`,
	);
}

async function run(): Promise<void> {
	writeFileSync(
		RUN_LOG_PATH,
		"",
	);
	const tempRoot = mkdtempSync(join(
		tmpdir(),
		"nimlat-smoke-",
	));
	app.setPath(
		"appData",
		tempRoot,
	);
	mkdirSync(
		join(
			tempRoot,
			"Nimlat",
			"logs",
		),
		{
			recursive: true,
		},
	);
	mkdirSync(
		join(
			tempRoot,
			"Nimlat",
			"data",
		),
		{
			recursive: true,
		},
	);
	logStage("stage=boot");

	let db: Database.Database | null = null;
	const timeout                    = setTimeout(
		() => {
			logStage("timeout");
			process.exit(1);
		},
		15000,
	);

	try {
		await app.whenReady();
		logStage("stage=ready");

		const require        = createRequire(import.meta.url);
		const { PATH_USER_DB } = require("../../src/constants/main/system-folders.ts") as {
			PATH_USER_DB: string;
		};
		const BetterSqlite3    = require("better-sqlite3") as typeof import("better-sqlite3");
		const legacyUserDb     = new BetterSqlite3(PATH_USER_DB);
		// Seed the immediately previous account schema so this smoke run proves the
		// approved column-removal migration keeps real provider state intact.
		legacyUserDb.exec(`
        CREATE TABLE externalTrackingAccounts
        (
            provider                TEXT PRIMARY KEY,
            status                  TEXT    NOT NULL,
            authKind                TEXT    NOT NULL,
            clientId                TEXT,
            accessToken             TEXT,
            refreshToken            TEXT,
            tokenExpiresAt          INTEGER,
            displayName             TEXT,
            publicProfileIdentifier TEXT,
            pendingCodeVerifier     TEXT,
            pendingState            TEXT,
            pendingRedirectUri      TEXT,
            pendingAuthUrl          TEXT,
            lastImportedAt          INTEGER,
            lastSyncedAt            INTEGER,
            lastError               TEXT,
            updatedAt               INTEGER NOT NULL
        );
        INSERT INTO externalTrackingAccounts (provider,
                                              status,
                                              authKind,
                                              displayName,
                                              publicProfileIdentifier,
                                              lastImportedAt,
                                              updatedAt)
        VALUES ('kitsu',
                'available',
                'password',
                'Unused legacy label',
                '1732935',
                123456,
                123456);
        CREATE TABLE externalTrackingProviderMediaStates
        (
            provider            TEXT    NOT NULL,
            mediaId             INTEGER NOT NULL,
            providerMediaId     TEXT,
            isWatched           BOOLEAN NOT NULL DEFAULT 0,
            watchedEpisodeCount INTEGER NOT NULL DEFAULT 0,
            episodesCount       INTEGER,
            rawStatus           TEXT,
            lastImportedAt      INTEGER,
            lastSyncedAt        INTEGER,
            updatedAt           INTEGER NOT NULL,
            PRIMARY KEY (provider, mediaId)
        );
        INSERT INTO externalTrackingProviderMediaStates (provider,
                                                         mediaId,
                                                         providerMediaId,
                                                         isWatched,
                                                         watchedEpisodeCount,
                                                         lastImportedAt,
                                                         updatedAt)
        VALUES ('kitsu',
                910001,
                'legacy-kitsu-media',
                1,
                12,
                234567,
                234567);
        CREATE TABLE externalTrackingImportRuns
        (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            provider  TEXT    NOT NULL,
            status    TEXT    NOT NULL,
            startedAt INTEGER NOT NULL
        );
        CREATE TABLE userMediaWatchStates
        (
            mediaId             INTEGER PRIMARY KEY,
            isWatched           BOOLEAN NOT NULL DEFAULT 0,
            watchedEpisodeCount INTEGER NOT NULL DEFAULT 0,
            episodesCount       INTEGER,
            watchedAt           INTEGER,
            sourceType          TEXT    NOT NULL DEFAULT 'local',
            sourceProvider      TEXT,
            updatedAt           INTEGER NOT NULL
        );
        CREATE TABLE userEpisodeWatchStates
        (
            episodeId      INTEGER PRIMARY KEY,
            mediaId        INTEGER NOT NULL,
            episodeNumber  INTEGER NOT NULL,
            isWatched      BOOLEAN NOT NULL DEFAULT 0,
            watchedAt      INTEGER,
            sourceType     TEXT    NOT NULL DEFAULT 'local',
            sourceProvider TEXT,
            updatedAt      INTEGER NOT NULL
        );
        CREATE TABLE externalTrackingSyncQueue
        (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            provider            TEXT    NOT NULL,
            mediaId             INTEGER NOT NULL,
            providerMediaId     TEXT,
            targetIsWatched     BOOLEAN NOT NULL,
            targetEpisodeCount  INTEGER NOT NULL DEFAULT 0,
            targetEpisodesCount INTEGER,
            sourceProvider      TEXT,
            reason              TEXT    NOT NULL,
            status              TEXT    NOT NULL DEFAULT 'pending',
            attempts            INTEGER NOT NULL DEFAULT 0,
            nextAttemptAt       INTEGER NOT NULL,
            lastError           TEXT,
            createdAt           INTEGER NOT NULL,
            updatedAt           INTEGER NOT NULL
        );
        INSERT INTO externalTrackingSyncQueue (provider,
                                               mediaId,
                                               targetIsWatched,
                                               targetEpisodeCount,
                                               sourceProvider,
                                               reason,
                                               status,
                                               nextAttemptAt,
                                               createdAt,
                                               updatedAt)
        VALUES ('mal',
                910001,
                1,
                12,
                NULL,
                'manual-export',
                'pending',
                123456,
                123456,
                123456);
		`);
		legacyUserDb.close();
		const databaseModule = require("../../src/database/index.ts");
		// noinspection LocalVariableNamingConventionJS
		const {
						initDatabases,
						AnimeDbFacade,
						UserDbFacade,
					}              = databaseModule;
		const { initUserDb }   = require("../../src/database/init/init-user-db.ts") as {
			initUserDb: (database: Database.Database) => void;
		};
		logStage("stage=imports");

		const assertGroupingDiagnosticsClean = (stage: string): void => {
			const diagnostics = UserDbFacade.grouping.inspectDiagnostics();
			assert(
				!diagnostics.hasIssues,
				`Expected grouping diagnostics to stay clean after ${ stage }; got ${ diagnostics.issueLabels.join(", ") }`,
			);
		};

		db = initDatabases();
		logStage("stage=db-init");

		runCheck(
			"schema bootstrap",
			() => {
				assertPresent(
					db,
					"Expected database to be initialized",
				);

				assertTableExists(
					db,
					"main",
					"userMediaOverrides",
				);
				assertTableExists(
					db,
					"main",
					"userGroups",
				);
				assertTableExists(
					db,
					"main",
					"userReleaseWatchStates",
				);
				assertTableExists(
					db,
					"main",
					"userScheduledMediaRefreshes",
				);
				assertTableExists(
					db,
					"anime_data",
					"media",
				);
				assertTableExists(
					db,
					"anime_data",
					"groups",
				);
				assertTableExists(
					db,
					"anime_data",
					"groupMedia",
				);
				assertSchemaSnapshot(
					db,
					"main",
				);
				assertSchemaSnapshot(
					db,
					"anime_data",
				);
				assertSchemaSnapshot(
					db,
					"image_data",
				);
				const accountColumns = db.prepare<[], { name: string }>(`
                    SELECT name
                    FROM pragma_table_info('externalTrackingAccounts')
				`).all();
				assert(
					!accountColumns.some(column => [
						"displayName",
						"pendingAuthUrl",
						"lastSyncedAt",
					].includes(column.name)),
					"Expected unused external tracking account columns to be removed",
				);
				const migratedKitsuAccount = db.prepare<[], {
					provider: string;
					publicProfileIdentifier: string | null;
					lastImportedAt: number | null;
				}>(`
                    SELECT provider, publicProfileIdentifier, lastImportedAt
                    FROM externalTrackingAccounts
                    WHERE provider = 'kitsu'
				`).get();
				assert(
					migratedKitsuAccount?.publicProfileIdentifier === "1732935"
					&& migratedKitsuAccount.lastImportedAt === 234_567,
					"Expected the tracking migration to preserve account state and latest import activity",
				);
				const migratedKitsuMapping = db.prepare<[], { providerMediaId: string }>(`
                    SELECT providerMediaId
                    FROM externalTrackingProviderMediaMappings
                    WHERE provider = 'kitsu'
                      AND mediaId = 910001
				`).get();
				assert(
					migratedKitsuMapping?.providerMediaId === "legacy-kitsu-media",
					"Expected the tracking migration to preserve runtime provider mappings",
				);
				const legacyTrackingTableCount = db.prepare<[], { total: number }>(`
                    SELECT COUNT(*) AS total
					FROM sqlite_master
					WHERE type = 'table'
					  AND name IN (
					      'externalTrackingProviderMediaStates',
					      'externalTrackingImportRuns',
					      'externalTrackingSyncQueue'
					  )
				`).get()?.total ?? 0;
				assert(
					legacyTrackingTableCount === 0,
					"Expected legacy external tracking state and automatic-sync queue to be removed",
				);
				const migratedPendingExport = db.prepare<[], {
					changedAt: number;
					revision: number;
				}>(`
                    SELECT revision, changedAt
                    FROM externalTrackingPendingExports
                    WHERE provider = 'mal'
                      AND mediaId = 910001
				`).get();
				assert(
					migratedPendingExport?.revision === 1
					&& migratedPendingExport.changedAt === 123_456,
					"Expected unfinished automatic-sync work to survive as a manual pending export",
				);
				const freshUserDb = new BetterSqlite3(":memory:");
				initUserDb(freshUserDb);
				const readTableSql   = (database: Database.Database, tableName: string): string => database
					.prepare<string, { sql: string }>(`
                        SELECT sql
                        FROM sqlite_master
                        WHERE type = 'table'
						  AND name = ?
					`)
					.get(tableName)?.sql.replace(
						/\s+/gu,
						" ",
					).trim() ?? "";
				const migratedUserDb = db;
				assertPresent(
					migratedUserDb,
					"Expected migrated user database to remain initialized",
				);
				[
					"externalTrackingAccounts",
					"externalTrackingPendingExports",
					"externalTrackingProviderMediaMappings",
					"userEpisodeWatchStates",
					"userMediaWatchStates",
				].forEach((tableName) => {
					assert(
						readTableSql(
							migratedUserDb,
							tableName,
						) === readTableSql(
							freshUserDb,
							tableName,
						),
						`Expected migrated and fresh ${ tableName } schemas to match`,
					);
				});
				freshUserDb.close();
			},
		);

		const sourceMedia           = createSmokeMedia(
			910001,
			910002,
		);
		const relatedMedia          = createSmokeMedia(910002);
		const thirdMedia            = createSmokeMedia(910003);
		const fourthMedia           = createSmokeMedia(910004);
		const animeOrphanBaseMedia  = createSmokeMedia(
			910005,
			910006,
		);
		const animeOrphanChildMedia = createSmokeMedia(910006);
		const upstreamAddedMedia    = createSmokeMedia(910007);
		const upstreamNewGroupMedia = createSmokeMedia(910008);

		AnimeDbFacade.media.upsertMedia(sourceMedia);
		AnimeDbFacade.media.upsertMedia(relatedMedia);
		AnimeDbFacade.media.upsertMedia(thirdMedia);
		AnimeDbFacade.media.upsertMedia(fourthMedia);
		AnimeDbFacade.media.upsertMedia(animeOrphanBaseMedia);
		AnimeDbFacade.media.upsertMedia(animeOrphanChildMedia);

		runCheck(
			"canonical ingestion queues secondary hydration",
			() => {
				assertPresent(
					db,
					"Expected database to be initialized before checking hydration queues",
				);
				const activeDb             = db;
				const secondaryQueueTables = [
					"mediaHydrationQueueCharacters",
					"mediaHydrationQueueStaff",
					"mediaHydrationQueueJikanEpisodes",
					"mediaHydrationQueueJikanEpisodeThumbnails",
				] as const;

				secondaryQueueTables.forEach((tableName) => {
					const queueRow = activeDb.prepare<number, { status: string }>(`
            SELECT status
            FROM anime_data.${ tableName }
            WHERE mediaId = ?
					`).get(sourceMedia.id);
					assert(
						queueRow?.status === "pending",
						`Expected canonical ingestion to enqueue ${ tableName } for media ${ sourceMedia.id }`,
					);
				});

				const legacyQueueCount = activeDb.prepare<[], { total: number }>(`
          SELECT COUNT(*) AS total
          FROM anime_data.mediaHydrationQueueAniListIngestion
				`).get()?.total ?? 0;
				assert(
					legacyQueueCount === 0,
					"Expected canonical ingestion to bypass the frozen AniList ID-only queue",
				);
			},
		);

		const firstGroupId = AnimeDbFacade.group.create(
			{
				baseMediaId: sourceMedia.id,
				name:        "Smoke Group",
				description: "Smoke group description",
				imageUrl:    "https://example.com/group.jpg",
			},
			[ sourceMedia.id ],
		);
		AnimeDbFacade.group.assignMediasToGroup(
			firstGroupId,
			[ relatedMedia.id ],
			true,
		);
		const secondGroupId = AnimeDbFacade.group.create(
			{
				baseMediaId: thirdMedia.id,
				name:        "Smoke Group Second",
				description: "Smoke group second description",
				imageUrl:    "https://example.com/group-second.jpg",
			},
			[ thirdMedia.id ],
		);
		const thirdGroupId  = AnimeDbFacade.group.create(
			{
				baseMediaId: fourthMedia.id,
				name:        "Smoke Group Third",
				description: "Smoke group third description",
				imageUrl:    "https://example.com/group-third.jpg",
			},
			[ fourthMedia.id ],
		);

		const mediaOverride: UserMediaOverrideRowDto = {
			mediaId:        sourceMedia.id,
			name:           "Smoke Override Name",
			description:    "Smoke override description",
			customImageUrl: "https://example.com/override.jpg",
			updatedAt:      Date.now(),
		};

		runCheck(
			"anime mode groups and media",
			() => {
				const groupCardsPage = AnimeDbFacade.group.listExplorerCards(
					0,
					20,
					"Smoke",
				);
				logStage("stage=group-read");
				assert(
					groupCardsPage.total >= 3,
					"Expected three smoke groups",
				);

				const firstGroupMediaIds = AnimeDbFacade.group.getMediaIds(firstGroupId);
				assert(
					firstGroupMediaIds.length === 2,
					"Expected the smoke group to contain two medias",
				);
				assert(
					AnimeDbFacade.updateGroupDetails(
						firstGroupId,
						{
							name:        "Smoke Group Updated",
							description: "Smoke group description updated",
							imageUrl:    "https://example.com/group-updated.jpg",
						},
					),
					"Expected anime-mode group metadata update to succeed",
				);
				const updatedAnimeGroupInspection = AnimeDbFacade.group.getInspectionSummary(firstGroupId);
				assert(
					updatedAnimeGroupInspection?.description === "Smoke group description updated",
					"Expected updated anime-mode group description",
				);
				assert(
					updatedAnimeGroupInspection?.imageUrl === "https://example.com/group-updated.jpg",
					"Expected updated anime-mode group image",
				);
				UserDbFacade.grouping.hideOfficialGroup(thirdGroupId);
				const libraryAfterHide = UserDbFacade.grouping.listLibraryDisplayItems(
					0,
					30,
					"910004",
				);
				assert(
					hasNoOfficialGroupRow(
						libraryAfterHide.items,
						thirdGroupId,
					),
					"Expected hidden official group to disappear from the Library",
				);
				assert(
					libraryAfterHide.items.some((item: {
						kind: string;
						mediaId?: number
					}) => item.kind === "media" && item.mediaId === 910004),
					"Expected hiding an official group to expose its orphaned media as a standalone Library row",
				);

				const animeOrphanGroupId = AnimeDbFacade.group.create(
					{
						baseMediaId: animeOrphanBaseMedia.id,
						name:        "Smoke Anime Orphan Group",
						description: "Smoke anime orphan group description",
						imageUrl:    "https://example.com/group-orphan.jpg",
					},
					[ animeOrphanBaseMedia.id ],
				);
				AnimeDbFacade.group.assignMediasToGroup(
					animeOrphanGroupId,
					[ animeOrphanChildMedia.id ],
					true,
				);
				const animeGroupCountBeforeOrphanRehome = AnimeDbFacade.group.count();
				AnimeDbFacade.group.removeMediaFromGroup(
					animeOrphanGroupId,
					animeOrphanChildMedia.id,
				);
				const animeGroupCountAfterOrphanRehome = AnimeDbFacade.group.count();
				assert(
					animeGroupCountAfterOrphanRehome === animeGroupCountBeforeOrphanRehome,
					"Expected orphan removal to leave anime-mode group count unchanged",
				);
				const rehomedOfficialGroupIds: number[] = AnimeDbFacade.media.getOfficialGroupIds(animeOrphanChildMedia.id);
				assert(
					rehomedOfficialGroupIds.length === 0,
					"Expected removed related media to become orphaned in anime mode",
				);

				const providerIds = AnimeDbFacade.media.getProviderIds(sourceMedia.id);
				assert(
					providerIds.idAniList === sourceMedia.id,
					"Expected AniList provider ID resolution",
				);

				const mediaInspectionBeforeOverride = AnimeDbFacade.media.getInspection(sourceMedia.id);
				assertPresent(
					mediaInspectionBeforeOverride,
					"Expected media inspection data",
				);
				assert(
					mediaInspectionBeforeOverride.mediaId === sourceMedia.id,
					"Expected canonical media inspection ID",
				);

				UserDbFacade.overrides.media.save(mediaOverride);
				UserDbFacade.integration.media.setStatus(
					sourceMedia.id,
					"tracked",
				);

				const mediaInspectionAfterOverride: MediaInspectionData | null = AnimeDbFacade.media.getInspection(sourceMedia.id);
				assertPresent(
					mediaInspectionAfterOverride,
					"Expected media inspection after override",
				);
				assert(
					mediaInspectionAfterOverride.name === "Smoke Override Name",
					"Expected override name in inspection",
				);
				assert(
					mediaInspectionAfterOverride.integrationStatus === "tracked",
					"Expected tracked integration status",
				);
				UserDbFacade.overrides.media.delete(sourceMedia.id);
				const mediaInspectionAfterOverrideReset: MediaInspectionData | null = AnimeDbFacade.media.getInspection(sourceMedia.id);
				assert(
					mediaInspectionAfterOverrideReset?.name === sourceMedia.title?.english,
					"Expected metadata reset to reveal source media name",
				);
				UserDbFacade.overrides.media.save(mediaOverride);
			},
		);

		await runCheckAsync(
			"episodes finalize and integration cascade",
			async () => {
				const syncState = AnimeDbFacade.getOrCreateJikanEpisodesSyncState(sourceMedia.id);
				AnimeDbFacade.upsertJikanEpisodesStagingPage(
					sourceMedia.id,
					syncState.syncRunId,
					createSmokeEpisodes(),
				);
				AnimeDbFacade.applyJikanEpisodeVideoThumbnailsToStagingPage(
					sourceMedia.id,
					syncState.syncRunId,
					createSmokeEpisodeVideos(),
				);
				AnimeDbFacade.updateJikanEpisodesSyncEpisodesProgress(
					sourceMedia.id,
					1,
					false,
				);
				AnimeDbFacade.updateJikanEpisodesSyncSynopsisProgress(
					sourceMedia.id,
					2,
					false,
				);
				const finalizeResult = AnimeDbFacade.finalizeJikanEpisodesSync(
					sourceMedia.id,
					syncState.syncRunId,
				);
				assert(
					finalizeResult.writtenRows === 2,
					"Expected two finalized Jikan episodes",
				);

				UserDbFacade.integration.episode.setStatus(
					sourceMedia.id,
					1,
					"integrated",
				);
				const mediaInspectionWithEpisodes = AnimeDbFacade.media.getInspection(sourceMedia.id);
				assertPresent(
					mediaInspectionWithEpisodes,
					"Expected media inspection with episodes",
				);
				assert(
					mediaInspectionWithEpisodes.episodes.length === 2,
					"Expected two episodes in inspection",
				);
				assert(
					mediaInspectionWithEpisodes.episodes[ 0 ]?.integrationStatus === "integrated",
					"Expected episode integration status to persist",
				);
				assert(
					mediaInspectionWithEpisodes.episodes[ 0 ]?.thumbnail === "https://example.com/thumb-1.jpg",
					"Expected thumbnail hydration to persist",
				);
				assert(
					mediaInspectionWithEpisodes.integrationPercent === 100,
					"Expected media integration percent to use tracked episodes only",
				);
				assert(
					AnimeDbFacade.getMediaEpisodeUpdatesIssue(sourceMedia.id) === null,
					"Expected no failed episode-updates issue after successful finalize",
				);

				UserDbFacade.integration.media.saveStateWithMoments(
					{
						mediaId:           fourthMedia.id,
						integrationStatus: "integrated",
						playbackIssueNote: null,
						hasDubIssue:       0,
						hasSubIssue:       0,
						hasEncodingIssue:  0,
						hasAudioIssue:     0,
						hasVideoIssue:     1,
						updatedAt:         Date.now(),
					},
					[
						{
							mediaId:               fourthMedia.id,
							playbackIssueCategory: "video",
							timeSeconds:           120,
							note:                  "Smoke artifact",
							updatedAt:             Date.now(),
						},
					],
				);
				const filmInspectionWithPlaybackIssue = AnimeDbFacade.media.getInspection(fourthMedia.id);
				assert(
					filmInspectionWithPlaybackIssue?.integrationPercent === 70,
					"Expected playback issue to cap film integration percent at 70",
				);
			},
		);

		const now = Date.now();

		runCheck(
			"release watch persistence and read models",
			() => {
				const pastState: UserReleaseWatchStateDto = {
					mediaId:              sourceMedia.id,
					watchDomain:          "past",
					state:                "released_needs_integration",
					resolvedReleaseAt:    now - 1000,
					releaseDatePrecision: "timestamp",
					releaseDateSource:    "provider_release_at",
					payloadJson:          JSON.stringify({ message: "Smoke past release" }),
					updatedAt:            now,
				};
				const upcomingState: UserReleaseWatchStateDto = {
					mediaId:              thirdMedia.id,
					watchDomain:          "upcoming",
					state:                "upcoming_episode_release",
					resolvedReleaseAt:    now + 1000,
					releaseDatePrecision: "timestamp",
					releaseDateSource:    "next_airing_episode",
					payloadJson:          JSON.stringify({ message: "Smoke upcoming release" }),
					updatedAt:            now,
				};
				const scheduledRefresh: UserScheduledMediaRefreshDto = {
					mediaId:                      sourceMedia.id,
					releaseWatchReason:           "release_window",
					scheduledReleaseAt:           now - 1000,
					nextAttemptAt:                now + 60_000,
					attemptCount:                 0,
					lastOutcome:                  "pending",
					lastObservedCatalogStateHash: "smoke-hash",
					updatedAt:                    now,
				};

				UserDbFacade.releaseWatch.replaceInterestMedia([
					{
						mediaId:       sourceMedia.id,
						sourceMediaId: sourceMedia.id,
						reason:        "tracked",
						updatedAt:     now,
					},
					{
						mediaId:       thirdMedia.id,
						sourceMediaId: sourceMedia.id,
						reason:        "related",
						updatedAt:     now,
					},
				]);
				UserDbFacade.releaseWatch.saveState(pastState);
				UserDbFacade.releaseWatch.saveState(upcomingState);
				UserDbFacade.releaseWatch.saveScheduledRefresh(scheduledRefresh);

				const pastPage = UserDbFacade.releaseWatch.listPast(
					"tracked",
					0,
					10,
				);
				assert(
					pastPage.total === 1 && pastPage.items[ 0 ]?.mediaId === sourceMedia.id,
					"Expected tracked past release-watch scope to return the source media",
				);
				assert(
					pastPage.items[ 0 ]?.payload?.message === "Smoke past release",
					"Expected past release-watch payload JSON to be parsed",
				);
				const upcomingPage = UserDbFacade.releaseWatch.listUpcoming(
					"tracked",
					0,
					10,
				);
				assert(
					upcomingPage.total === 1 && upcomingPage.items[ 0 ]?.mediaId === thirdMedia.id,
					"Expected upcoming release-watch episode filter to return the third media",
				);
				const timelineRows = UserDbFacade.releaseWatch.getGroupTimeline({
					source:  "official",
					groupId: firstGroupId,
				});
				assert(
					timelineRows.length === 2 && timelineRows.every((row: {
						releaseDateSource: string
					}) => row.releaseDateSource === "media_start_date"),
					"Expected official group release timeline to include both group medias with resolved media start dates",
				);
				assertPresent(
					db,
					"Expected database to stay available during release-watch checks",
				);
				const scheduledRefreshCount = db.prepare<[ number ], { total: number }>(`
            SELECT COUNT(*) AS total
            FROM userScheduledMediaRefreshes
            WHERE mediaId = ?
				`).get(sourceMedia.id)?.total ?? 0;
				assert(
					scheduledRefreshCount === 1,
					"Expected scheduled media refresh persistence to store one release-window row",
				);
				logStage("stage=release-watch");
			},
		);

		runCheck(
			"user grouping lifecycle",
			() => {
				UserDbFacade.config.setAnimeDbVersion("smoke-v1");
				const reconcileSafetyDiagnostics = AnimeDbFacade.metadata.assertAttachedReconcileSafety();
				assert(
					reconcileSafetyDiagnostics.groupsMissingBaseMediaAniListIdCount === 0
					&& reconcileSafetyDiagnostics.groupsWithBaseMediaMismatchCount === 0,
					"Expected smoke anime DB seed data to satisfy reconcile safety checks",
				);
				UserDbFacade.grouping.forkAnimeGroupingToSnapshot();
				const groupingStateAfterFork = UserDbFacade.grouping.getState();
				assert(
					groupingStateAfterFork.groupingMode === "user",
					"Expected grouping fork to switch the app into user grouping mode",
				);
				assert(
					groupingStateAfterFork.forkedFromAnimeDbVersion === "smoke-v1",
					"Expected grouping fork to stamp the current anime DB version onto the user snapshot",
				);
				const firstAnimeGroupMediaIdsAtFork = AnimeDbFacade.group.getMediaIds(firstGroupId);
				const firstUserGroupMediaIdsAtFork  = UserDbFacade.grouping.getMediaIds(firstGroupId);
				assert(
					firstAnimeGroupMediaIdsAtFork.join(",")
					=== firstUserGroupMediaIdsAtFork.join(","),
					"Expected grouping fork to copy the visible anime-mode membership into the initial user snapshot",
				);
				assertGroupingDiagnosticsClean("grouping fork");
				AnimeDbFacade.media.upsertMedia(upstreamAddedMedia);
				AnimeDbFacade.media.upsertMedia(upstreamNewGroupMedia);
				AnimeDbFacade.group.assignMediasToGroup(
					firstGroupId,
					[ upstreamAddedMedia.id ],
					true,
				);
				const upstreamImportedGroupId = AnimeDbFacade.group.create(
					{
						baseMediaId: upstreamNewGroupMedia.id,
						name: "Smoke Reconcile Imported",
						description: "Imported during reconcile",
						imageUrl: "https://example.com/group-reconcile-imported.jpg",
					},
					[ upstreamNewGroupMedia.id ],
				);
				const userGroupCards          = UserDbFacade.grouping.listExplorerCards(
					0,
					20,
					"Smoke",
				);
				assert(
					userGroupCards.total >= 3,
					"Expected user grouping explorer cards after fork",
				);
				const firstUserGroupMediaIdsBeforeReconcile = UserDbFacade.grouping.getMediaIds(firstGroupId);
				assert(
					!firstUserGroupMediaIdsBeforeReconcile.includes(upstreamAddedMedia.id),
					"Expected forked user snapshot to stay stale before reconcile apply",
				);

				const applyResult: ReconcileApplyExecutionResult = UserDbFacade.groupingReconcile.applySafeImport(
					UserDbFacade.grouping.getState().forkedFromAnimeDbVersion ?? null,
					"smoke-v2",
				);
				assert(
					applyResult.report.runId > 0,
					"Expected safe reconcile apply to return a positive runId",
				);
				assert(
					applyResult.report.applySummary.newGroupsImported === 1,
					"Expected safe reconcile apply to import one new upstream group",
				);
				assert(
					applyResult.report.applySummary.existingLineagesUpdatedWithNewMedias === 1,
					"Expected safe reconcile apply to add medias to one clean lineage",
				);
				assert(
					applyResult.report.applySummary.importedMediaCount === 2,
					"Expected safe reconcile apply to count all imported medias",
				);
				assert(
					applyResult.impact.affectedMediaIds.includes(upstreamAddedMedia.id)
					&& applyResult.impact.affectedMediaIds.includes(upstreamNewGroupMedia.id),
					"Expected safe reconcile apply impact to include imported medias",
				);
				assert(
					applyResult.impact.affectedGroupIds.includes(firstGroupId),
					"Expected safe reconcile apply impact to include the updated clean lineage group",
				);

				const firstUserGroupMediaIdsAfterReconcile = UserDbFacade.grouping.getMediaIds(firstGroupId);
				assert(
					firstUserGroupMediaIdsAfterReconcile.includes(upstreamAddedMedia.id),
					"Expected safe reconcile apply to import new upstream media into the mapped user group",
				);
				const importedUserGroupCards = UserDbFacade.grouping.listExplorerCards(
					0,
					20,
					"Reconcile Imported",
				);
				assert(
					importedUserGroupCards.cards.some((card: { name: string }) => card.name === "Smoke Reconcile Imported"),
					"Expected safe reconcile apply to materialize the new upstream group in the user snapshot",
				);
				const groupingStateAfterApply = UserDbFacade.grouping.getState();
				assert(
					groupingStateAfterApply.lastReconciledAnimeDbVersion === "smoke-v2",
					"Expected safe reconcile apply to stamp the latest reconciled anime DB version",
				);
				assert(
					groupingStateAfterApply.lastReconcileStatus === "completed",
					"Expected safe reconcile apply to persist completed reconcile state",
				);
				assert(
					groupingStateAfterApply.lastReconcileSummaryJson?.includes(`\"runId\":${ applyResult.report.runId }`) ?? false,
					"Expected safe reconcile apply to persist a summary JSON payload",
				);
				assertGroupingDiagnosticsClean("safe reconcile apply");
				const importedAnimeGroupStillExists = AnimeDbFacade.group.getInspectionSummary(upstreamImportedGroupId);
				assertPresent(
					importedAnimeGroupStillExists,
					"Expected upstream anime group to remain available after reconcile apply",
				);
				assertPresent(
					db,
					"Expected database to stay available during user grouping repair checks",
				);
				const deletedImportedLineageRow = db.prepare<[ number ], { groupLineageId: number }>(`
            SELECT groupLineageId
            FROM userGroupLineages
            WHERE userGroupId = ?
            LIMIT 1
				`).get(upstreamImportedGroupId);
				assert(
					typeof deletedImportedLineageRow?.groupLineageId === "number",
					"Expected imported user group to expose an official lineage before repair simulation",
				);
				db.prepare<[ number ]>(`
            DELETE
            FROM userGroups
            WHERE id = ?
				`).run(upstreamImportedGroupId);
				// noinspection SqlResolve
				db.prepare<[ number, number ]>(`
            UPDATE userGroupLineages
            SET userGroupId        = NULL,
                status             = 'deleted',
                lastUserModifiedAt = ?
            WHERE groupLineageId = ?
				`).run(
					Date.now(),
					deletedImportedLineageRow.groupLineageId,
				);
				const restoredLineageResult = UserDbFacade.grouping.restoreDeletedUpstreamLineage(
					deletedImportedLineageRow.groupLineageId,
				);
				assert(
					restoredLineageResult.restoredGroupId === upstreamImportedGroupId,
					"Expected deleted lineage restore to reclaim the original upstream group id when it is free",
				);
				const restoredImportedGroupMediaIds = UserDbFacade.grouping.getMediaIds(restoredLineageResult.restoredGroupId);
				assert(
					restoredImportedGroupMediaIds.includes(upstreamNewGroupMedia.id),
					"Expected deleted lineage restore to re-import the upstream group media membership",
				);
				assertGroupingDiagnosticsClean("deleted lineage restore");

				UserDbFacade.grouping.assignMediasToGroup(
					secondGroupId,
					[ sourceMedia.id ],
				);
				const secondUserGroupMediaIds = UserDbFacade.grouping.getMediaIds(secondGroupId);
				assert(
					secondUserGroupMediaIds.includes(sourceMedia.id),
					"Expected additive assignment to target user group",
				);
				const removedUpstreamLineageRow = db?.prepare<[ number ], { groupLineageId: number }>(`
            SELECT groupLineageId
            FROM anime_data.groups
            WHERE id = ?
				`).get(thirdGroupId);
				assert(
					typeof removedUpstreamLineageRow?.groupLineageId === "number",
					"Expected third group to expose an upstream lineage id before replacement simulation",
				);
				db?.prepare<[ number ]>(`
            DELETE
            FROM anime_data.groupMedia
            WHERE groupId = ?
				`).run(thirdGroupId);
				db?.prepare<[ number ]>(`
            DELETE
            FROM anime_data.groups
            WHERE id = ?
				`).run(thirdGroupId);
				db?.prepare<[ number ]>(`
            DELETE
            FROM anime_data.groupLineages
            WHERE groupLineageId = ?
				`).run(removedUpstreamLineageRow.groupLineageId);

				const preflightResult: {
					runId: number;
					startedAt: number;
					completedAt: number;
					items: ReconcileLineageItem[];
					summary: ReconcilePreflightSummary;
				} = UserDbFacade.groupingReconcile.runPreflight(
					UserDbFacade.grouping.getState().forkedFromAnimeDbVersion ?? null,
					"smoke-v1",
				);
				assert(
					preflightResult.runId > 0,
					"Expected reconcile preflight to return a positive runId",
				);
				assert(
					Array.isArray(preflightResult.items),
					"Expected reconcile preflight items to be an array",
				);
				assert(
					preflightResult.items.every(item => typeof item.groupLineageId === "number"),
					"Expected every reconcile lineage item to carry a numeric groupLineageId",
				);
				assert(
					preflightResult.startedAt > 0,
					"Expected reconcile preflight startedAt timestamp to be set",
				);
				assert(
					preflightResult.completedAt >= preflightResult.startedAt,
					"Expected reconcile preflight completedAt to be at or after startedAt",
				);
				assert(
					preflightResult.summary.totalNewMediaCount >= 0,
					"Expected reconcile preflight summary to expose a bounded aggregate view",
				);
				assert(
					preflightResult.summary.newGroups
					+ preflightResult.summary.newMediaInCleanLineages
					+ preflightResult.summary.cleanLineages
					+ preflightResult.summary.userDeletedLineages
					+ preflightResult.summary.conflicts
					=== preflightResult.items.length,
					"Expected reconcile preflight summary counts to cover every returned lineage item",
				);
				assert(
					preflightResult.summary.conflicts >= 1,
					"Expected reconcile preflight to surface at least one conflict after the smoke grouping mutations",
				);
				assert(
					preflightResult.items.some(item =>
						item.classification === "conflict"
						&& item.conflictReason === "lineage_membership_drift"),
					"Expected reconcile preflight to classify membership drift conflicts explicitly",
				);
				assert(
					preflightResult.items.some(item =>
						item.classification === "conflict"
						&& item.conflictReason === "upstream_lineage_removed"),
					"Expected reconcile preflight to classify active user lineages removed from the new anime DB",
				);
				const persistedRunRow = db.prepare<[ number ], {
					status: string;
					summaryJson: string | null;
				}>(`
            SELECT status, summaryJson
            FROM userGroupingReconcileRuns
            WHERE id = ?
				`).get(preflightResult.runId);
				assert(
					persistedRunRow?.status === "completed",
					"Expected reconcile preflight run row to be completed",
				);
				assert(
					JSON.stringify(preflightResult.summary) === persistedRunRow?.summaryJson,
					"Expected reconcile preflight summaryJson to persist the computed summary",
				);
				const persistedConflictCount = db.prepare<[ number ], { total: number }>(`
            SELECT COUNT(*) AS total
            FROM userGroupingReconcileConflicts
            WHERE runId = ?
				`).get(preflightResult.runId)?.total ?? 0;
				assert(
					persistedConflictCount === preflightResult.summary.conflicts,
					"Expected persisted reconcile conflicts to match the reported conflict count",
				);
				const persistedConflictPayloads = db.prepare<[ number ], { payloadJson: string }>(`
            SELECT payloadJson
            FROM userGroupingReconcileConflicts
            WHERE runId = ?
            ORDER BY id ASC
				`).all(preflightResult.runId).map(row => JSON.parse(row.payloadJson) as ReconcileConflictRecordPayload);
				assert(
					persistedConflictPayloads.some(payload => payload.autoApplyBehavior === "skip_blocking"),
					"Expected persisted reconcile conflicts to store blocking safe-apply outcome behavior for structural conflicts",
				);
				assert(
					persistedConflictPayloads.some(payload =>
						payload.conflictReason === "upstream_lineage_removed"
						&& payload.autoApplyBehavior === "skip_warn"),
					"Expected persisted reconcile conflicts to store warning-only behavior for removed upstream lineages",
				);
				assert(
					persistedConflictPayloads.every(payload => payload.recommendedAction === "review_upstream_grouping_change"),
					"Expected persisted reconcile conflicts to store the recommended manual review action",
				);
				logStage("stage=reconcile-preflight");

				UserDbFacade.grouping.removeMediaFromGroup(
					firstGroupId,
					sourceMedia.id,
				);
				const firstUserGroupMediaIdsAfterRemoval = UserDbFacade.grouping.getMediaIds(firstGroupId);
				assert(
					firstUserGroupMediaIdsAfterRemoval.length === 2,
					"Expected removal to keep the remaining imported medias in the first user group",
				);
				assert(
					UserDbFacade.grouping.getBaseMediaId(firstGroupId) === relatedMedia.id,
					"Expected base media reassignment after removing the previous base media",
				);

				UserDbFacade.grouping.mergeGroupsIntoTarget(
					firstGroupId,
					[ secondGroupId ],
				);
				const mergedGroupMediaIds = UserDbFacade.grouping.getMediaIds(firstGroupId);
				assert(
					mergedGroupMediaIds.length === 4,
					"Expected merged group to contain the full union of medias after reconcile imports",
				);
				assert(
					UserDbFacade.grouping.getInspectionSummary(secondGroupId) === null,
					"Expected merged source group to be deleted",
				);
				UserDbFacade.integration.group.setStatusForGroupRef(
					{
						source:  "user",
						groupId: firstGroupId,
					},
					"downloaded",
				);
				const mergedGroupMediaRangeAfterStatus: GroupMediaWallRange = UserDbFacade.grouping.listMediaCardsRange(
					firstGroupId,
					0,
					100,
					"",
				);
				assert(
					mergedGroupMediaRangeAfterStatus.items.length === 4
					&& mergedGroupMediaRangeAfterStatus.items.every(media => media.integrationStatus === "downloaded"),
					"Expected group status cascade to update every child media status",
				);

				const groupCountBeforeDelete = UserDbFacade.grouping.countGroups();
				UserDbFacade.grouping.deleteGroup(thirdGroupId);
				const groupCountAfterDelete = UserDbFacade.grouping.countGroups();
				assert(
					groupCountAfterDelete === groupCountBeforeDelete - 1,
					"Expected deleting a user group to reduce the user group count",
				);
				assert(
					UserDbFacade.grouping.getInspectionSummary(thirdGroupId) === null,
					"Expected deleted group inspection to be unavailable",
				);
				const libraryFourthMediaItems = UserDbFacade.grouping.listLibraryDisplayItems(
					0,
					20,
					"910004",
				);
				assert(
					libraryFourthMediaItems.items.some((item: {
						kind: string;
						mediaId?: number
					}) => item.kind === "media" && item.mediaId === 910004),
					"Expected orphaned media to surface directly as a standalone library media row",
				);

				UserDbFacade.config.setAnimeDbVersion("smoke-v3");
				const rebuildResult = UserDbFacade.grouping.rebuildFromCurrentAnimeDefaults();
				assert(
					rebuildResult.affectedMediaIds.includes(sourceMedia.id)
					&& rebuildResult.affectedMediaIds.includes(upstreamNewGroupMedia.id),
					"Expected rebuild to invalidate both manual and imported media memberships",
				);
				const groupingStateAfterRebuild = UserDbFacade.grouping.getState();
				assert(
					groupingStateAfterRebuild.groupingMode === "user",
					"Expected rebuild to keep grouping mode in user",
				);
				assert(
					groupingStateAfterRebuild.forkedFromAnimeDbVersion === "smoke-v3",
					"Expected rebuild to stamp the current anime DB version as the new fork baseline",
				);
				assert(
					groupingStateAfterRebuild.lastReconcileStatus == null,
					"Expected rebuild to clear obsolete last-reconcile status metadata",
				);
				const rebuiltSecondGroupMediaIds = UserDbFacade.grouping.getMediaIds(secondGroupId);
				assert(
					!rebuiltSecondGroupMediaIds.includes(sourceMedia.id),
					"Expected rebuild to drop the prior manual additive assignment",
				);
				const rebuiltImportedCards = UserDbFacade.grouping.listExplorerCards(
					0,
					20,
					"Reconcile Imported",
				);
				assert(
					rebuiltImportedCards.cards.some((card: { name: string }) => card.name === "Smoke Reconcile Imported"),
					"Expected rebuild to restore the current upstream imported group into the fresh user snapshot",
				);
				const rebuiltPreflight = UserDbFacade.groupingReconcile.runPreflight(
					UserDbFacade.grouping.getState().forkedFromAnimeDbVersion ?? null,
					"smoke-v3",
				);
				assert(
					rebuiltPreflight.summary.newGroups === 0
					&& rebuiltPreflight.summary.newMediaInCleanLineages === 0
					&& rebuiltPreflight.summary.userDeletedLineages === 0,
					`Expected rebuild to clear manual drift/new imports from the user snapshot; got ${ JSON.stringify(rebuiltPreflight.summary) }`,
				);
				assert(
					rebuiltPreflight.summary.conflicts === 0,
					`Expected rebuild to eliminate structural upstream-group noise before reconcile; got ${ JSON.stringify(rebuiltPreflight.summary) }`,
				);
				const supersededConflictCount = db.prepare<[], { total: number }>(`
            SELECT COUNT(*) AS total
            FROM userGroupingReconcileConflicts
            WHERE resolutionStatus = 'superseded'
				`).get()?.total ?? 0;
				assert(
					supersededConflictCount >= persistedConflictCount,
					"Expected rebuild to supersede previously pending reconcile conflicts from the abandoned snapshot",
				);
				assertGroupingDiagnosticsClean("rebuild from anime defaults");

				UserDbFacade.grouping.resetToAnimeGrouping();
				assert(
					UserDbFacade.grouping.getState().groupingMode === "anime",
					"Expected reset to switch grouping mode back to anime",
				);
				assert(
					UserDbFacade.grouping.countGroups() === 0,
					"Expected reset to clear every forked user group row",
				);
				assert(
					AnimeDbFacade.group.listExplorerCards(
						0,
						20,
						"Smoke",
					).total >= 3,
					"Expected anime-mode explorer cards to stay available after reset",
				);
				assertGroupingDiagnosticsClean("reset to anime grouping");
				logStage("stage=user-grouping");
			},
		);

		runCheck(
			"queue retry visibility",
			() => {
				AnimeDbFacade.retryMediaEpisodeUpdates(sourceMedia.id);
				assert(
					AnimeDbFacade.getMediaEpisodeUpdatesQueueStatus(sourceMedia.id) === "pending",
					"Expected retry to enqueue media episode updates",
				);
				assert(
					AnimeDbFacade.hasMediaEpisodeUpdatesManualPriority(sourceMedia.id),
					"Expected retried episode updates to carry manual priority",
				);
				AnimeDbFacade.markFailedGroupJikanEpisodesQueue(
					relatedMedia.id,
					"Smoke episode sync failure",
					"transient_failure",
				);
				const erroredContentPage = AnimeDbFacade.listErroredContent(
					0,
					10,
				);
				assert(
					erroredContentPage.items.some((item: ErroredContentItem) => item.queue === "jikan-episodes" && item.mediaId === relatedMedia.id),
					"Expected failed Jikan episode queue row to appear in errored content",
				);
				assert(
					AnimeDbFacade.retryErroredContent({
						queue:   "jikan-episodes",
						mediaId: relatedMedia.id,
					}),
					"Expected errored content retry to move failed queue row back to pending",
				);
				const erroredContentAfterRetry = AnimeDbFacade.listErroredContent(
					0,
					10,
				);
				assert(
					!erroredContentAfterRetry.items.some((item: ErroredContentItem) => item.queue === "jikan-episodes" && item.mediaId === relatedMedia.id),
					"Expected retried queue row to disappear from errored content",
				);
				assert(
					AnimeDbFacade.getMediaEpisodeUpdatesQueueStatus(relatedMedia.id) === "pending",
					"Expected errored content retry to requeue episode updates",
				);
				logStage("stage=queues");
			},
		);

		const animeDbPath = app.getPath("appData");
		assert(
			existsSync(animeDbPath),
			"Expected smoke appData path to exist",
		);

		assertPresent(
			db,
			"Expected database to be initialized before closing",
		);
		db.close();
		db = null;
		clearTimeout(timeout);
		logStage("ok");
	} finally {
		clearTimeout(timeout);
		if (db?.open) {
			(db as Database.Database).close();
		}
		rmSync(
			tempRoot,
			{
				recursive: true,
				force:     true,
			},
		);
		app.quit();
	}
}

run().then(() => {
	process.exit(0);
}).catch((error) => {
	appendFileSync(
		RUN_LOG_PATH,
		`${ new Date().toISOString() } failed ${ error instanceof Error ? error.stack ?? error.message : String(error) }\n`,
	);
	process.exit(1);
});
