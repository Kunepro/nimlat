import { expect } from "@playwright/test";
import { createRequire } from "node:module";
import type {
	ElectronApplication,
	Page,
} from "playwright";
import type { ToasterType } from "../../src/shared/types/toaster";

export interface E2EMediaIds {
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

export interface E2EGroupIds {
	sourceGroupId: number;
	targetGroupId: number;
	libraryHideGroupId: number;
	reconcileImportedGroupId: number;
}

export interface MainHostSnapshot {
	ready: boolean;
	tempRoot: string;
	ids: E2EMediaIds;
	groupIds: E2EGroupIds;
}

export type HarnessWindowKind = "base" | "library" | "episode-status" | "media-wall-stress";

export interface HarnessWindowOptions {
	search?: string;
	width?: number;
	height?: number;
}

interface MainCommandMap {
	openWindow: {
		args: [ kind: HarnessWindowKind, options?: HarnessWindowOptions ];
		result: number;
	};
	destroyWindow: {
		args: [ windowId: number ];
		result: void;
	};
	destroyAllSecondaryWindows: {
		args: [];
		result: void;
	};
	setWindowSize: {
		args: [ windowId: number, width: number, height: number ];
		result: void;
	};
	getCanvasDiagnosticsRawSetting: {
		args: [];
		result: string | null;
	};
	prepareSafeReconcile: {
		args: [];
		result: void;
	};
	prepareAutomaticDownloadReconcileRollback: {
		args: [ fromVersion: string ];
		result: void;
	};
	dropAutomaticDownloadReconcileFailureTrigger: {
		args: [];
		result: void;
	};
	getUserGroupContainsMedia: {
		args: [ groupId: number, mediaId: number ];
		result: boolean;
	};
	getUserGroupingReconcileState: {
		args: [];
		result: {
			lastReconciledAnimeDbVersion: string | null;
			lastReconcileStatus: string | null;
		};
	};
	getMockAnimeDbReleaseDownloadCount: {
		args: [];
		result: number;
	};
	deleteImportedGroupLineage: {
		args: [];
		result: number;
	};
	getAnimeGroupExists: {
		args: [ groupId: number ];
		result: boolean;
	};
	seedReleaseWatchRows: {
		args: [];
		result: void;
	};
	sendToasterMessage: {
		args: [ type: ToasterType, message: string ];
		result: void;
	};
	installMockExternalTrackingFetch: {
		args: [];
		result: void;
	};
	installMockKitsuTrackingFetch: {
		args: [];
		result: void;
	};
	installMockKitsuXmlDialog: {
		args: [];
		result: void;
	};
	installMockExternalTrackingFetchFailure: {
		args: [ errorMessage: string ];
		result: void;
	};
	installMockExternalTrackingPushFailure: {
		args: [ errorMessage: string ];
		result: void;
	};
	installMockAnimeDbReleaseDownload: {
		args: [ version: string ];
		result: void;
	};
	installMockAnimeDbReleaseDownloadFailure: {
		args: [ version: string, errorMessage: string ];
		result: void;
	};
	prepareAnimeDbIncrementalUpdateMedia: {
		args: [ description: string ];
		result: void;
	};
	appDataPathExists: {
		args: [];
		result: boolean;
	};
	getMainProcessDiagnostics: {
		args: [];
		result: string[];
	};
	clearMainProcessDiagnostics: {
		args: [];
		result: void;
	};
	closeDatabaseAndProviders: {
		args: [];
		result: void;
	};
}

export type MainCommandName = keyof MainCommandMap;

type MainCommandArgs<Name extends MainCommandName> = MainCommandMap[Name]["args"];

type MainCommandResult<Name extends MainCommandName> = MainCommandMap[Name]["result"];

interface MainHostForEvaluate {
	__nimlatE2E?: {
		ready: boolean;
		paths: {
			tempRoot: string;
		};
		ids: E2EMediaIds;
		groupIds: E2EGroupIds;
		commands: Record<MainCommandName, (...args: unknown[]) => unknown>;
	};
}

interface OpenedHarnessPage {
	page: Page;
	windowId: number;
}

interface MediaWallTerminalActionTarget {
	actionRowIndex: number;
	confirm?: boolean;
	targetIndex: number;
	testId: string;
}

interface MediaWallDomLayout {
	cardHeight: number;
	cardWidth: number;
	columns: number;
	contentInsetTop: number;
	horizontalGap: number;
	rowHeight: number;
	xOrigin: number;
}

const require                       = createRequire(__filename);
export const electronExecutablePath = require("electron") as string;

const harnessUrlMarkers: Record<Exclude<HarnessWindowKind, "base">, string> = {
	"episode-status":    "nimlat-e2e-episode-status.html",
	library:             "nimlat-e2e-app.html",
	"media-wall-stress": "nimlat-e2e-media-wall-stress.html",
};

interface RendererDiagnosticFailure {
	kind: "console.error" | "page.error" | "page.crash";
	message: string;
	pageUrl: string;
}

const watchedRendererPages                                    = new WeakSet<Page>();
const rendererDiagnosticFailures: RendererDiagnosticFailure[] = [];

function isKnownRendererConsoleMessage(message: string): boolean {
	return message.includes("Download the React DevTools")
		|| message.includes("react.dev/link/react-devtools-faq")
		|| message.includes("[antd: compatible]")
		|| message.includes("[DEPRECATED] atomFamily")
		|| message.includes("Automatic fallback to software WebGL")
		|| message.includes("GL Driver Message")
		|| message.includes("No available adapters.");
}

function recordRendererDiagnostic(page: Page, failure: Omit<RendererDiagnosticFailure, "pageUrl">): void {
	rendererDiagnosticFailures.push({
		...failure,
		pageUrl: page.url(),
	});
}

function formatRendererDiagnosticFailure(failure: RendererDiagnosticFailure): string {
	return [
		`${ failure.kind } at ${ failure.pageUrl || "<initializing renderer>" }`,
		failure.message,
	].join(": ");
}

export function consumeRendererDiagnostics(): RendererDiagnosticFailure[] {
	return rendererDiagnosticFailures.splice(
		0,
		rendererDiagnosticFailures.length,
	);
}

export function assertNoRendererDiagnostics(): void {
	const failures = consumeRendererDiagnostics();
	if (failures.length === 0) {
		return;
	}
	throw new Error([
		"Unexpected renderer diagnostics were emitted during E2E.",
		...failures.map(formatRendererDiagnosticFailure),
	].join("\n"));
}

export async function assertNoMainProcessDiagnostics(electronApp: ElectronApplication): Promise<void> {
	const diagnostics = await runMainCommand(
		electronApp,
		"getMainProcessDiagnostics",
	).catch((error: unknown) => [
		error instanceof Error ? error.stack ?? error.message : String(error),
	]);
	await runMainCommand(
		electronApp,
		"clearMainProcessDiagnostics",
	).catch(() => undefined);
	if (diagnostics.length === 0) {
		return;
	}
	throw new Error([
		"Unexpected main-process diagnostics were emitted during E2E.",
		...diagnostics,
	].join("\n"));
}

export function watchRendererConsole(page: Page): void {
	if (watchedRendererPages.has(page)) {
		return;
	}
	watchedRendererPages.add(page);
	page.on(
		"console",
		(message) => {
			const text = message.text();
			if (isKnownRendererConsoleMessage(text)) {
				return;
			}
			if (message.type() === "error") {
				recordRendererDiagnostic(
					page,
					{
						kind:    "console.error",
						message: text,
					},
				);
				return;
			}
			process.stdout.write(`[test:e2e] renderer:console:${ message.type() } ${ text }\n`);
		},
	);
	page.on(
		"pageerror",
		(error) => {
			recordRendererDiagnostic(
				page,
				{
					kind:    "page.error",
					message: error.stack ?? error.message,
				},
			);
		},
	);
	page.on(
		"crash",
		() => {
			recordRendererDiagnostic(
				page,
				{
					kind:    "page.crash",
					message: "Renderer process crashed.",
				},
			);
		},
	);
}

// Renderer assertions mostly call the preload API. Keep evaluation centralized so
// Playwright owns window discovery, timeout, retry, and trace behavior.
export async function evaluateRenderer<T>(page: Page, expression: string): Promise<T> {
	return page.evaluate(
		(source) => {
			const AsyncFunction = Object.getPrototypeOf(async function noop() {
				return undefined;
			}).constructor as new (body: string) => () => Promise<unknown>;
			const run           = new AsyncFunction(`return (${ source });`);
			return run();
		},
		expression,
	) as Promise<T>;
}

export async function waitForRendererCondition(
	page: Page,
	expression: string,
	timeout = 6_000,
): Promise<void> {
	await expect.poll(
		() => evaluateRenderer<boolean>(
			page,
			expression,
		),
		{ timeout },
	).toBe(true);
}

export async function wait(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(
		resolve,
		ms,
	));
}

async function findHarnessPage(
	electronApp: ElectronApplication,
	kind: Exclude<HarnessWindowKind, "base">,
	eventPage: Page,
): Promise<Page> {
	const marker = harnessUrlMarkers[ kind ];
	if (eventPage.url().includes(marker)) {
		return eventPage;
	}

	const startedAt = Date.now();
	while (Date.now() - startedAt < 6_000) {
		const page = electronApp.windows().find(candidate => candidate.url().includes(marker));
		if (page) {
			return page;
		}
		await wait(50);
	}

	throw new Error([
		`Timed out waiting for ${ kind } harness page.`,
		`Expected URL marker: ${ marker }`,
		`Window URLs: ${ electronApp.windows().map(page => page.url()).join(", ") }`,
	].join("\n"));
}

export async function waitForMainReady(electronApp: ElectronApplication): Promise<MainHostSnapshot> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < 60_000) {
		const snapshot = await electronApp.evaluate(() => {
			const host = (globalThis as MainHostForEvaluate).__nimlatE2E;
			if (!host?.ready) {
				return null;
			}
			return {
				ready:    host.ready,
				tempRoot: host.paths.tempRoot,
				ids:      host.ids,
				groupIds: host.groupIds,
			} satisfies MainHostSnapshot;
		})
			.catch(() => null);
		if (snapshot) {
			return snapshot;
		}
		await wait(100);
	}
	throw new Error("Timed out waiting for Playwright Electron E2E host readiness.");
}

export async function getMainSnapshot(electronApp: ElectronApplication): Promise<MainHostSnapshot> {
	return electronApp.evaluate(() => {
		const host = (globalThis as MainHostForEvaluate).__nimlatE2E;
		if (!host?.ready) {
			throw new Error("Playwright Electron E2E host is not ready.");
		}
		return {
			ready:    host.ready,
			tempRoot: host.paths.tempRoot,
			ids:      host.ids,
			groupIds: host.groupIds,
		} satisfies MainHostSnapshot;
	});
}

export async function runMainCommand<Name extends MainCommandName>(
	electronApp: ElectronApplication,
	name: Name,
	args: MainCommandArgs<Name> = [] as unknown as MainCommandArgs<Name>,
): Promise<Awaited<MainCommandResult<Name>>> {
	return electronApp.evaluate(
		(_electronProcess, payload: { name: MainCommandName; args: unknown[] }) => {
			const host = (globalThis as MainHostForEvaluate).__nimlatE2E;
			if (!host?.ready) {
				throw new Error("Playwright Electron E2E host is not ready.");
			}
			const command = host.commands[ payload.name ];
			return command(...payload.args);
		},
		{
			name,
			args,
		},
	) as Promise<Awaited<MainCommandResult<Name>>>;
}

export async function openHarnessPage(
	electronApp: ElectronApplication,
	kind: Exclude<HarnessWindowKind, "base">,
	options?: HarnessWindowOptions,
): Promise<OpenedHarnessPage> {
	const pagePromise = electronApp.waitForEvent("window");
	const windowId    = await runMainCommand(
		electronApp,
		"openWindow",
		[
			kind,
			options,
		],
	);
	const page        = await findHarnessPage(
		electronApp,
		kind,
		await pagePromise,
	);
	watchRendererConsole(page);
	return {
		page,
		windowId,
	};
}

// Pixi cards are rendered inside one canvas-backed layer, so E2E must interact
// through card coordinates instead of querying per-card DOM nodes.
export async function runMediaWallTerminalAction(
	page: Page,
	target: MediaWallTerminalActionTarget,
): Promise<void> {
	await page.evaluate(
		async (actionTarget) => {
			const CARD_POSTER_LEFT           = 12;
			const CARD_POSTER_TOP            = 12;
			const ACTION_BUTTON_SIZE         = 24;
			const ACTION_BUTTON_INSET        = 2;
			const TERMINAL_ACTION_START_Y    = 112;
			const TERMINAL_ACTION_ROW_HEIGHT = 24;
			const TERMINAL_CONFIRM_Y         = 104;

			const nextFrame           = () => new Promise<void>((resolve) => {
				requestAnimationFrame(() => resolve());
			});
			const waitForReactCommit  = async () => {
				await nextFrame();
				await nextFrame();
			};
			const readNumberAttribute = (element: HTMLElement, name: string): number => {
				const rawValue = element.getAttribute(name);
				const value    = rawValue === null ? Number.NaN : Number(rawValue);
				if (!Number.isFinite(value)) {
					throw new Error(`Media wall attribute ${ name } is missing or invalid.`);
				}
				return value;
			};
			const readLayout          = (wall: HTMLElement): MediaWallDomLayout => ({
				cardHeight:      readNumberAttribute(
					wall,
					"data-media-wall-card-height",
				),
				cardWidth:       readNumberAttribute(
					wall,
					"data-media-wall-card-width",
				),
				columns:         readNumberAttribute(
					wall,
					"data-media-wall-columns",
				),
				contentInsetTop: readNumberAttribute(
					wall,
					"data-media-wall-content-inset-top",
				),
				horizontalGap:   readNumberAttribute(
					wall,
					"data-media-wall-horizontal-gap",
				),
				rowHeight:       readNumberAttribute(
					wall,
					"data-media-wall-row-height",
				),
				xOrigin:         readNumberAttribute(
					wall,
					"data-media-wall-x-origin",
				),
			});
			const selector            = `[data-testid="${ CSS.escape(actionTarget.testId) }"]`;
			const wall                = document.querySelector(selector);
			if (!(wall instanceof HTMLElement)) {
				throw new Error(`Media wall ${ actionTarget.testId } was not found.`);
			}
			const pixiLayer = wall.firstElementChild;
			if (!(pixiLayer instanceof HTMLElement)) {
				throw new Error(`Media wall ${ actionTarget.testId } Pixi layer was not found.`);
			}
			const layout   = readLayout(wall);
			const row      = Math.floor(actionTarget.targetIndex / layout.columns);
			const column   = actionTarget.targetIndex % layout.columns;
			wall.scrollTop = Math.max(
				0,
				row * layout.rowHeight,
			);
			wall.dispatchEvent(new Event(
				"scroll",
				{ bubbles: true },
			));
			await waitForReactCommit();

			const bounds    = pixiLayer.getBoundingClientRect();
			const scrollTop = wall.scrollTop;
			const cardX     = layout.xOrigin + column * (layout.cardWidth + layout.horizontalGap);
			const cardY     = layout.contentInsetTop + row * layout.rowHeight - scrollTop;
			if (cardY + layout.cardHeight < 0 || cardY > bounds.height) {
				throw new Error(`Media wall target index ${ actionTarget.targetIndex } is not visible after scrolling.`);
			}
			const toClientPoint = (localX: number, localY: number) => ({
				clientX: bounds.left + cardX + localX,
				clientY: bounds.top + cardY + localY,
			});
			const pointerMove   = (localX: number, localY: number) => {
				const point = toClientPoint(
					localX,
					localY,
				);
				pixiLayer.dispatchEvent(new PointerEvent(
					"pointermove",
					{
						...point,
						bubbles:     true,
						pointerId:   1,
						pointerType: "mouse",
					},
				));
			};
			const click         = (localX: number, localY: number) => {
				const point = toClientPoint(
					localX,
					localY,
				);
				pixiLayer.dispatchEvent(new MouseEvent(
					"click",
					{
						...point,
						bubbles:    true,
						cancelable: true,
					},
				));
			};

			const actionMenuX = layout.cardWidth - CARD_POSTER_LEFT - ACTION_BUTTON_INSET - (ACTION_BUTTON_SIZE / 2);
			const actionMenuY = CARD_POSTER_TOP + ACTION_BUTTON_INSET + (ACTION_BUTTON_SIZE / 2);
			pointerMove(
				actionMenuX,
				actionMenuY,
			);
			await waitForReactCommit();
			click(
				actionMenuX,
				actionMenuY,
			);
			await waitForReactCommit();

			click(
				CARD_POSTER_LEFT + 36,
				CARD_POSTER_TOP + TERMINAL_ACTION_START_Y + (actionTarget.actionRowIndex * TERMINAL_ACTION_ROW_HEIGHT) + 12,
			);
			await waitForReactCommit();
			if (actionTarget.confirm) {
				click(
					CARD_POSTER_LEFT + 20,
					CARD_POSTER_TOP + TERMINAL_CONFIRM_Y + 13,
				);
				await waitForReactCommit();
			}
		},
		target,
	);
}
