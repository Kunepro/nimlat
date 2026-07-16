// @vitest-environment jsdom

import type { DownloadSearchProvider } from "@nimlat/types/download-search";
import message from "antd/es/message";
import {
	createElement,
	type ReactElement,
	useState,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchFacade } from "../../../facades";
import type { PreferencesModalState } from "../../../types/modals";
import { useDownloadSearchPreferencesPersistence } from "./useDownloadSearchPreferencesPersistence";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function createDeferred<T>(): Deferred<T> {
	let resolveDeferred: (value: T) => void        = () => {};
	let rejectDeferred: (reason?: unknown) => void = () => {};
	const promise                                  = new Promise<T>((
		resolve,
		reject,
	) => {
		resolveDeferred = resolve;
		rejectDeferred  = reject;
	});

	return {
		promise,
		resolve: resolveDeferred,
		reject:  rejectDeferred,
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

async function waitForAssertion(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch {
			await new Promise(resolve => setTimeout(
				resolve,
				0,
			));
			await Promise.resolve();
		}
	}

	assertion();
}

function createProvider(): DownloadSearchProvider {
	return {
		id:        "provider-1",
		label:     "Provider 1",
		category:  "torrent",
		baseUrl:   "https://provider.example/search?q={query}",
		isBuiltIn: false,
		enabled:   true,
		sortOrder: 1,
	};
}

function createPreferencesState(patch: Partial<PreferencesModalState> = {}): PreferencesModalState {
	const state: PreferencesModalState = {
		isOpen:                     true,
		isAdultContentEnabled:      false,
		backgroundStyle:            "kanaMatrix",
		preferredTitleLanguage:     "english",
		isDevModeEnabled:           false,
		isCanvasDiagnosticsEnabled: false,
		downloadBrowserConfig:      { mode: "system" },
		downloadBrowserDraft:       { mode: "system" },
		downloadBrowserCustomPath:  "",
		downloadProviders:          [ createProvider() ],
		isAddingDownloadProvider:   false,
		editingDownloadProviderId:  null,
		newDownloadProvider:        {
			label:    "",
			category: "torrent",
			baseUrl:  "",
		},
		editDownloadProvider:       {
			label:    "",
			category: "torrent",
			baseUrl:  "",
		},
	};

	return {
		...state,
		...patch,
	};
}

function usePersistenceHarness(initialState = createPreferencesState()) {
	const [ modalState, setModalState ] = useState(() => initialState);
	const persistence                   = useDownloadSearchPreferencesPersistence(
		modalState,
		setModalState,
	);

	return {
		modalState,
		...persistence,
	};
}

describe(
	"useDownloadSearchPreferencesPersistence",
	() => {
		beforeEach(() => {
			vi.spyOn(
				message,
				"error",
			).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"rolls back an optimistic provider toggle when persistence fails",
			async () => {
				const write = createDeferred<void>();
				vi.spyOn(
					DownloadSearchFacade,
					"setProviderEnabled",
				).mockReturnValue(write.promise);
				const { result } = renderHook(usePersistenceHarness);

				flushSync(() => {
					result.current.handleProviderToggle(
						"provider-1",
						false,
					);
				});

				expect(result.current.modalState.downloadProviders[ 0 ]?.enabled).toBe(false);

				write.reject(new Error("provider write failed"));

				await waitForAssertion(() => {
					expect(result.current.modalState.downloadProviders[ 0 ]?.enabled).toBe(true);
					expect(message.error).toHaveBeenCalledWith("provider write failed");
				});
			},
		);

		it(
			"commits browser config only after persistence succeeds",
			async () => {
				const write = createDeferred<void>();
				vi.spyOn(
					DownloadSearchFacade,
					"saveBrowserConfig",
				).mockReturnValue(write.promise);
				const { result } = renderHook(() => usePersistenceHarness(createPreferencesState({
					downloadBrowserConfig:     { mode: "system" },
					downloadBrowserDraft:      {
						mode:           "custom",
						executablePath: "/Applications/Browser.app",
					},
					downloadBrowserCustomPath: "/Applications/Browser.app",
				})));

				flushSync(() => {
					result.current.saveDownloadBrowserConfig();
				});

				expect(DownloadSearchFacade.saveBrowserConfig).toHaveBeenCalledWith({
					mode:           "custom",
					executablePath: "/Applications/Browser.app",
				});
				expect(result.current.modalState.downloadBrowserConfig).toEqual({ mode: "system" });

				write.resolve(undefined);

				await waitForAssertion(() => {
					expect(result.current.modalState.downloadBrowserConfig).toEqual({
						mode:           "custom",
						executablePath: "/Applications/Browser.app",
					});
					expect(result.current.modalState.downloadBrowserDraft).toEqual({
						mode:           "custom",
						executablePath: "/Applications/Browser.app",
					});
				});
			},
		);

		it(
			"applies a picked browser executable and ignores canceled picks",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"pickBrowserExecutable",
				)
					.mockResolvedValueOnce({
						success:        true,
						executablePath: "/Applications/Browser.app",
					})
					.mockResolvedValueOnce({ success: false });
				const { result } = renderHook(usePersistenceHarness);

				flushSync(() => {
					result.current.pickDownloadBrowserExecutable();
				});

				await waitForAssertion(() => {
					expect(result.current.modalState.downloadBrowserCustomPath).toBe("/Applications/Browser.app");
					expect(result.current.modalState.downloadBrowserDraft).toEqual({
						mode:           "custom",
						executablePath: "/Applications/Browser.app",
					});
				});

				flushSync(() => {
					result.current.pickDownloadBrowserExecutable();
				});

				await waitForAssertion(() => {
					expect(DownloadSearchFacade.pickBrowserExecutable).toHaveBeenCalledTimes(2);
					expect(result.current.modalState.downloadBrowserCustomPath).toBe("/Applications/Browser.app");
				});
			},
		);
	},
);
