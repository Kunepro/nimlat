// @vitest-environment jsdom

import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import {
	createElement,
	type ReactElement,
	useState,
} from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchFacade } from "../../../../facades";
import { useDownloadSearchProviderActions } from "./useDownloadSearchProviderActions";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

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
		selectedPresetIds: [ "resolution-1080" ],
		customQueryText:   "dual audio",
	};
}

function createProvider(): DownloadSearchProvider {
	return {
		id:        "nyaa",
		label:     "Nyaa",
		baseUrl:   "https://nyaa.test/?q={query}",
		category:  "torrent",
		isBuiltIn: true,
		enabled:   true,
		sortOrder: 0,
	};
}

function createKeywordPresets(): DownloadSearchKeywordPreset[] {
	return [
		{
			id:        "resolution-1080",
			label:     "1080p",
			category:  "quality",
			value:     "1080p",
			isBuiltIn: true,
			enabled:   true,
		},
		{
			id:        "audio-aac",
			label:     "AAC",
			category:  "audio",
			value:     "AAC",
			isBuiltIn: true,
			enabled:   true,
		},
	];
}

function createQueryPreset(
	id: string,
	selectedPresetIds: string[],
	customQueryText: string,
): DownloadSearchQueryPreset {
	return {
		id,
		label:     id,
		selectedPresetIds,
		customQueryText,
		enabled:   true,
		createdAt: 1,
		updatedAt: 1,
	};
}

function useProviderActionsHarness() {
	const [ actionError, setActionError ] = useState<string | null>("previous error");
	const actions                         = useDownloadSearchProviderActions({
		builderState:   createBuilderState(),
		numericMediaId: 42,
		presets:        createKeywordPresets(),
		title:          "Planetes",
		setActionError,
	});

	return {
		actionError,
		...actions,
	};
}

describe(
	"useDownloadSearchProviderActions",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"stops on the first failed provider open instead of clearing the error with later queries",
			async () => {
				const saveBuilderState   = vi.spyOn(
					DownloadSearchFacade,
					"saveBuilderState",
				).mockResolvedValue();
				const openProviderSearch = vi.spyOn(
					DownloadSearchFacade,
					"openProviderSearch",
				)
					.mockResolvedValueOnce({
						success: false,
						error:   "provider down",
					})
					.mockResolvedValueOnce({
						success: true,
						url:     "https://nyaa.test/?q=Planetes",
					});
				const { result }         = renderHook(useProviderActionsHarness);

				await result.current.openProviderPresets(
					createProvider(),
					[
						createQueryPreset(
							"first",
							[ "resolution-1080" ],
							"batch",
						),
						createQueryPreset(
							"second",
							[ "audio-aac" ],
							"dual",
						),
					],
				);

				await waitForAssertion(() => {
					expect(result.current.actionError).toBe("provider down");
				});
				expect(saveBuilderState).toHaveBeenCalledTimes(1);
				expect(openProviderSearch).toHaveBeenCalledTimes(1);
			},
		);
	},
);
