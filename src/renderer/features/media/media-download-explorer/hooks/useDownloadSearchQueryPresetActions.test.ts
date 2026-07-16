// @vitest-environment jsdom

import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
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
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchFacade } from "../../../../facades";
import { useDownloadSearchQueryPresetActions } from "./useDownloadSearchQueryPresetActions";

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

function createBuilderState(): DownloadSearchBuilderState {
	return {
		titleLanguage:     "english",
		selectedPresetIds: [],
		customQueryText:   "",
	};
}

function createQueryPreset(): DownloadSearchQueryPreset {
	return {
		id:                "preset-1",
		label:             "Preset 1",
		selectedPresetIds: [],
		customQueryText:   "",
		enabled:           true,
		createdAt:         1,
		updatedAt:         1,
	};
}

function useQueryPresetActionsHarness() {
	const [ actionError, setActionError ]   = useState<string | null>("previous error");
	const [ queryPresets, setQueryPresets ] = useState<DownloadSearchQueryPreset[]>([
		createQueryPreset(),
	]);
	const actions                           = useDownloadSearchQueryPresetActions({
		builderState:     createBuilderState(),
		presetLabelDraft: "",
		selectedPresets:  [] satisfies DownloadSearchKeywordPreset[],
		setActionError,
		setQueryPresets,
	});

	return {
		actionError,
		queryPresets,
		...actions,
	};
}

describe(
	"useDownloadSearchQueryPresetActions",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"rolls back an optimistic query preset toggle when persistence fails",
			async () => {
				const toggleWrite = createDeferred<void>();
				vi.spyOn(
					DownloadSearchFacade,
					"setQueryPresetEnabled",
				).mockReturnValue(toggleWrite.promise);
				const { result } = renderHook(useQueryPresetActionsHarness);

				flushSync(() => {
					result.current.toggleQueryPreset(
						"preset-1",
						false,
					);
				});

				expect(result.current.actionError).toBeNull();
				expect(result.current.queryPresets[ 0 ]?.enabled).toBe(false);

				toggleWrite.reject(new Error("toggle failed"));

				await waitForAssertion(() => {
					expect(result.current.queryPresets[ 0 ]?.enabled).toBe(true);
					expect(result.current.actionError).toBe("toggle failed");
				});
			},
		);
	},
);
