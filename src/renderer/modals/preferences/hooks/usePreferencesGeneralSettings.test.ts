// @vitest-environment jsdom

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
import { UserConfigFacade } from "../../../facades";
import type { PreferencesModalState } from "../../../types/modals";
import { usePreferencesGeneralSettings } from "./usePreferencesGeneralSettings";

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

function createPreferencesState(): PreferencesModalState {
	return {
		isOpen:                     false,
		isAdultContentEnabled:      false,
		backgroundStyle:            "kanaMatrix",
		preferredTitleLanguage:     "english",
		isDevModeEnabled:           false,
		isCanvasDiagnosticsEnabled: false,
		downloadBrowserConfig:      { mode: "system" },
		downloadBrowserDraft:       { mode: "system" },
		downloadBrowserCustomPath:  "",
		downloadProviders:          [],
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
}

function useGeneralSettingsHarness() {
	const [ modalState, setModalState ] = useState(createPreferencesState);
	const generalSettings               = usePreferencesGeneralSettings(
		modalState,
		setModalState,
	);

	return {
		modalState,
		...generalSettings,
	};
}

describe(
	"usePreferencesGeneralSettings",
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
			"does not let a stale failed background save roll back a newer choice",
			async () => {
				const firstWrite  = createDeferred<void>();
				const secondWrite = createDeferred<void>();
				vi.spyOn(
					UserConfigFacade,
					"setBackgroundStyle",
				)
					.mockReturnValueOnce(firstWrite.promise)
					.mockReturnValueOnce(secondWrite.promise);
				const { result } = renderHook(useGeneralSettingsHarness);

				flushSync(() => {
					result.current.handleBackgroundStyleChange("synthwave");
				});
				flushSync(() => {
					result.current.handleBackgroundStyleChange("kanaGrid");
				});

				firstWrite.reject(new Error("background write failed"));

				await waitForAssertion(() => {
					expect(result.current.modalState.backgroundStyle).toBe("kanaGrid");
					expect(message.error).toHaveBeenCalledWith("background write failed");
				});

				secondWrite.resolve(undefined);
			},
		);
	},
);
