// @vitest-environment jsdom

import type {
	AnimeDbDownloadActionResult,
	AnimeDbDownloadProgressData,
	AnimeDbStartupReadiness,
} from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ROUTES } from "../../../constants/route-config";
import { DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS } from "../download-precached-anime-db-model";
import { useDownloadPrecachedAnimeDbState } from "./use-download-precached-anime-db-state";

const navigateMock = vi.hoisted(() => vi.fn<(options: { to: string }) => void>());
const runnerMock   = vi.hoisted(() => ({
	cancelAnimeDbDownload:                     vi.fn<() => Promise<AnimeDbDownloadActionResult>>(),
	loadAnimeDbDownloadDevModeStatus:          vi.fn<() => Promise<boolean>>(),
	loadAnimeDbDownloadStatus:                 vi.fn<() => Promise<AnimeDbDownloadProgressData>>(),
	loadAnimeDbStartupReadiness:               vi.fn<() => Promise<AnimeDbStartupReadiness>>(),
	startAnimeDbDownload:                      vi.fn<() => Promise<AnimeDbDownloadActionResult>>(),
	subscribeToAnimeDbDownloadProgressChanges: vi.fn(),
}));

vi.mock(
	"@tanstack/react-router",
	() => ({
		useNavigate: () => navigateMock,
	}),
);

vi.mock(
	"../download-precached-anime-db-runner",
	() => runnerMock,
);

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let progressStream: Subject<AnimeDbDownloadProgressData>;

function createProgress(overrides: Partial<AnimeDbDownloadProgressData> = {}): AnimeDbDownloadProgressData {
	return {
		...DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS,
		...overrides,
	};
}

function createReadiness(overrides: Partial<AnimeDbStartupReadiness> = {}): AnimeDbStartupReadiness {
	return {
		status:                 "empty",
		canUseLocalCatalog:     false,
		shouldDownloadBaseline: true,
		animeDbVersion:         null,
		message:                "Catalogue is empty.",
		...overrides,
	};
}

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
	});

	const unmount = () => {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		unmount,
	};
}

async function flushHookEffects(): Promise<void> {
	for (let index = 0; index < 3; index += 1) {
		await new Promise(resolve => setTimeout(
			resolve,
			0,
		));
		await Promise.resolve();
	}
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	let lastError: unknown;
	for (let attempt = 0; attempt < 20; attempt += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await flushHookEffects();
		}
	}
	throw lastError;
}

describe(
	"useDownloadPrecachedAnimeDbState",
	() => {
		beforeEach(() => {
			progressStream = new Subject<AnimeDbDownloadProgressData>();
			runnerMock.loadAnimeDbDownloadDevModeStatus.mockResolvedValue(true);
			runnerMock.loadAnimeDbStartupReadiness.mockResolvedValue(createReadiness());
			runnerMock.loadAnimeDbDownloadStatus.mockResolvedValue(createProgress({ status: "idle" }));
			runnerMock.startAnimeDbDownload.mockResolvedValue({ success: true });
			runnerMock.cancelAnimeDbDownload.mockResolvedValue({ success: true });
			runnerMock.subscribeToAnimeDbDownloadProgressChanges.mockImplementation((listener: (progress: AnimeDbDownloadProgressData) => void) =>
				progressStream.subscribe(listener));
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			progressStream.complete();
			vi.clearAllMocks();
		});

		it(
			"loads first-run setup flags, auto-starts idle downloads, and follows progress events",
			async () => {
				const { result } = renderHook(useDownloadPrecachedAnimeDbState);

				await waitForAssertion(() => {
					expect(result.current.isDevMode).toBe(true);
					expect(result.current.canSkipToApp).toBe(true);
					expect(result.current.canUseLocalCatalog).toBe(false);
					expect(result.current.progress.status).toBe("idle");
					expect(runnerMock.startAnimeDbDownload).toHaveBeenCalledTimes(1);
				});

				flushSync(() => {
					progressStream.next(createProgress({
						status:  "downloading",
						percent: 0.25,
					}));
				});

				await waitForAssertion(() => {
					expect(result.current.progress.status).toBe("downloading");
					expect(result.current.progressPercent).toBe(25);
				});

				flushSync(() => {
					progressStream.next(createProgress({
						status:  "completed",
						percent: 1,
					}));
				});

				await waitForAssertion(() => {
					expect(navigateMock).toHaveBeenCalledWith({ to: ROUTES.GROUPS.FULL_URL });
				});
			},
		);

		it(
			"surfaces explicit action failures without repeating persisted progress errors",
			async () => {
				runnerMock.loadAnimeDbDownloadStatus.mockResolvedValue(createProgress({ status: "canceled" }));
				runnerMock.startAnimeDbDownload.mockResolvedValueOnce({
					success: false,
					error:   "download action failed",
				});
				const { result } = renderHook(useDownloadPrecachedAnimeDbState);

				await flushHookEffects();
				await result.current.startDownload(false);

				await waitForAssertion(() => {
					expect(result.current.visibleUiError).toBe("download action failed");
				});

				flushSync(() => {
					progressStream.next(createProgress({
						status:       "error",
						errorMessage: "download action failed",
					}));
				});

				await waitForAssertion(() => {
					expect(result.current.visibleUiError).toBeNull();
				});
			},
		);

		it(
			"does not auto-download when an installed catalog is already usable",
			async () => {
				runnerMock.loadAnimeDbStartupReadiness.mockResolvedValue(createReadiness({
					status:                 "ready",
					canUseLocalCatalog:     true,
					shouldDownloadBaseline: false,
					animeDbVersion:         "anime-db-v2026.07.02",
				}));

				const { result } = renderHook(useDownloadPrecachedAnimeDbState);

				await waitForAssertion(() => {
					expect(result.current.canUseLocalCatalog).toBe(true);
				});
				expect(runnerMock.startAnimeDbDownload).not.toHaveBeenCalled();
			},
		);
	},
);
