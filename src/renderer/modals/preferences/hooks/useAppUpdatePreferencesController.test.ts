// @vitest-environment jsdom

import { createAppVersionInfo } from "@nimlat/functions";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type { AnimeDbDownloadReleaseStatus } from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { Observable } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useAppUpdatePreferencesController } from "./useAppUpdatePreferencesController";

const appUpdateFacade = vi.hoisted(() => ({
	getStatus:               vi.fn<() => Promise<AppUpdateStatus>>(),
	checkForUpdates:         vi.fn<() => Promise<AppUpdateStatus>>(),
	downloadUpdate:          vi.fn<() => Promise<AppUpdateStatus>>(),
	installDownloadedUpdate: vi.fn<() => Promise<void>>(),
	statusChanges:           vi.fn<() => Observable<AppUpdateStatus>>(),
}));

const animeDbDownloadFacade = vi.hoisted(() => ({
	getReleaseStatus: vi.fn<() => Promise<AnimeDbDownloadReleaseStatus>>(),
}));

vi.mock(
	"../../../facades",
	() => ({
		AnimeDbDownloadFacade: animeDbDownloadFacade,
		AppUpdateFacade:       appUpdateFacade,
	}),
);

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let statusChangedStream: ReturnType<typeof createStatusTestStream>;
let unsubscribeStatus: ReturnType<typeof vi.fn>;

function createStatusTestStream() {
	let listener: ((status: AppUpdateStatus) => void) | null = null;
	const unsubscribe                                        = vi.fn();
	const observable                                         = new Observable<AppUpdateStatus>((subscriber) => {
		listener = status => subscriber.next(status);
		return unsubscribe;
	});

	return {
		emit: (status: AppUpdateStatus) => {
			if (!listener) {
				throw new Error("App update status stream was emitted before subscription.");
			}

			listener(status);
		},
		observable,
		unsubscribe,
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

function createDeferred<T>() {
	let resolveValue: ((value: T) => void) | null = null;
	const promise                                 = new Promise<T>((resolve) => {
		resolveValue = resolve;
	});

	return {
		promise,
		resolve: (value: T) => {
			if (!resolveValue) {
				throw new Error("Deferred promise was not initialized.");
			}

			resolveValue(value);
		},
	};
}

function createIdleStatus(version = "1.0.0"): AppUpdateStatus {
	return {
		state:   "idle",
		version: createAppVersionInfo(version),
	};
}

function createAvailableStatus(
	version       = "1.0.0",
	latestVersion = "2.0.0",
): AppUpdateStatus {
	return {
		state:         "available",
		version:       createAppVersionInfo(version),
		latestVersion: createAppVersionInfo(latestVersion),
	};
}

function createDownloadedStatus(
	version       = "1.0.0",
	latestVersion = "2.0.0",
): AppUpdateStatus {
	return {
		state:         "downloaded",
		version:       createAppVersionInfo(version),
		latestVersion: createAppVersionInfo(latestVersion),
	};
}

function createReleaseStatus(
	installedVersion: string | null = null,
	latestVersion: string | null    = null,
	updateAvailable                 = false,
): AnimeDbDownloadReleaseStatus {
	return {
		installedVersion,
		latestVersion,
		updateAvailable,
	};
}

async function flushHookEffects() {
	for (let index = 0; index < 3; index += 1) {
		await new Promise(resolve => setTimeout(
			resolve,
			0,
		));
		await Promise.resolve();
		await Promise.resolve();
	}
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch {
			await flushHookEffects();
		}
	}

	assertion();
}

describe(
	"useAppUpdatePreferencesController",
	() => {
		beforeEach(() => {
			appUpdateFacade.getStatus.mockReset();
			appUpdateFacade.checkForUpdates.mockReset();
			appUpdateFacade.downloadUpdate.mockReset();
			appUpdateFacade.installDownloadedUpdate.mockReset();
			appUpdateFacade.statusChanges.mockReset();
			animeDbDownloadFacade.getReleaseStatus.mockReset();
			statusChangedStream = createStatusTestStream();
			unsubscribeStatus   = statusChangedStream.unsubscribe;
			appUpdateFacade.getStatus.mockResolvedValue(createIdleStatus());
			appUpdateFacade.checkForUpdates.mockResolvedValue(createAvailableStatus());
			appUpdateFacade.downloadUpdate.mockResolvedValue(createAvailableStatus());
			appUpdateFacade.installDownloadedUpdate.mockResolvedValue();
			appUpdateFacade.statusChanges.mockReturnValue(statusChangedStream.observable);
			animeDbDownloadFacade.getReleaseStatus.mockResolvedValue(createReleaseStatus());
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
		});

		it(
			"loads app and AnimeDB release status into the public preferences model",
			async () => {
				const availableStatus = createAvailableStatus(
					"1.0.0",
					"3.0.0",
				);
				appUpdateFacade.getStatus.mockResolvedValueOnce(availableStatus);
				animeDbDownloadFacade.getReleaseStatus.mockResolvedValueOnce(createReleaseStatus(
					"anime-db-v1",
					"anime-db-v2",
					true,
				));

				const { result } = renderHook(useAppUpdatePreferencesController);

				await waitForAssertion(() => {
					expect(result.current.status).toBe(availableStatus);
					expect(result.current.canUpdateApp).toBe(true);
					expect(result.current.currentVersion).toBe("Version 1");
					expect(result.current.installedAnimeDbVersion).toBe("anime-db-v1");
					expect(result.current.latestAnimeDbVersion).toBe("anime-db-v2");
					expect(result.current.canDownloadAnimeDb).toBe(true);
					expect(result.current.animeDbReleaseStatusMessage).toBe("anime-db-v2 is available.");
				});
			},
		);

		it(
			"keeps pushed update status fresher than the initial status request",
			async () => {
				const slowInitialStatus = createDeferred<AppUpdateStatus>();
				const pushedStatus      = createAvailableStatus(
					"1.0.0",
					"4.0.0",
				);
				appUpdateFacade.getStatus.mockReturnValueOnce(slowInitialStatus.promise);

				const {
								result,
								unmount,
							} = renderHook(useAppUpdatePreferencesController);
				await flushHookEffects();

				flushSync(() => {
					statusChangedStream.emit(pushedStatus);
				});

				await waitForAssertion(() => {
					expect(result.current.status).toBe(pushedStatus);
					expect(result.current.latestPublishedAppVersion).toBe("Version 4");
				});

				slowInitialStatus.resolve(createIdleStatus("1.0.0"));
				await flushHookEffects();

				expect(result.current.status).toBe(pushedStatus);

				unmount();
				expect(unsubscribeStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"applies check action results and routes downloaded updates to the install action",
			async () => {
				const downloadedStatus = createDownloadedStatus();
				const checkedStatus    = createAvailableStatus(
					"1.0.0",
					"5.0.0",
				);
				appUpdateFacade.getStatus.mockResolvedValueOnce(downloadedStatus);
				appUpdateFacade.checkForUpdates.mockResolvedValueOnce(checkedStatus);

				const { result } = renderHook(useAppUpdatePreferencesController);

				await waitForAssertion(() => {
					expect(result.current.updateAppLabel).toBe("Restart to install");
				});

				flushSync(() => {
					result.current.updateApp();
				});

				await waitForAssertion(() => {
					expect(appUpdateFacade.installDownloadedUpdate).toHaveBeenCalledTimes(1);
				});
				expect(appUpdateFacade.downloadUpdate).not.toHaveBeenCalled();

				flushSync(() => {
					result.current.checkForUpdates();
				});

				await waitForAssertion(() => {
					expect(result.current.status).toBe(checkedStatus);
					expect(result.current.latestPublishedAppVersion).toBe("Version 5");
					expect(result.current.isActionRunning).toBe(false);
				});
			},
		);

		it(
			"reruns the remote AnimeDB version check on demand",
			async () => {
				animeDbDownloadFacade.getReleaseStatus
					.mockResolvedValueOnce(createReleaseStatus(
						"anime-db-v1",
						"anime-db-v2",
						true,
					))
					.mockResolvedValueOnce(createReleaseStatus(
						"anime-db-v2",
						"anime-db-v2",
						false,
					));

				const { result } = renderHook(useAppUpdatePreferencesController);

				await waitForAssertion(() => {
					expect(result.current.canDownloadAnimeDb).toBe(true);
				});

				flushSync(() => {
					result.current.checkAnimeDbReleaseStatus();
				});

				await waitForAssertion(() => {
					expect(animeDbDownloadFacade.getReleaseStatus).toHaveBeenCalledTimes(2);
					expect(result.current.canDownloadAnimeDb).toBe(false);
					expect(result.current.animeDbReleaseStatusMessage).toBe("You already have the latest AnimeDB version.");
				});
			},
		);
	},
);
