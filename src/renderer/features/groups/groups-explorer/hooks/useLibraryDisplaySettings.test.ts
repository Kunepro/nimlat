// @vitest-environment jsdom

import type {
	LibraryDisplayFilters,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import message from "antd/es/message";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	EMPTY,
	Observable,
	Subject,
} from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useLibraryDisplaySettings } from "./useLibraryDisplaySettings";

const libraryDisplaySettingsRunner = vi.hoisted(() => ({
	getLibraryAdultContentStatus:     vi.fn<() => Promise<boolean>>(),
	getLibraryDisplayFilters:         vi.fn<() => Promise<LibraryDisplayFilters>>(),
	libraryAdultContentStatusChanges: vi.fn<() => Observable<boolean>>(),
	listLibraryFilterOptions:         vi.fn<() => Promise<LibraryFilterOptions>>(),
	saveLibraryDisplayFilters:        vi.fn<(filters: LibraryDisplayFilters) => Promise<void>>(),
}));

vi.mock(
	"../library-display-settings-runner",
	() => ({
		getLibraryAdultContentStatus:     libraryDisplaySettingsRunner.getLibraryAdultContentStatus,
		getLibraryDisplayFilters:         libraryDisplaySettingsRunner.getLibraryDisplayFilters,
		libraryAdultContentStatusChanges: libraryDisplaySettingsRunner.libraryAdultContentStatusChanges,
		listLibraryFilterOptions:         libraryDisplaySettingsRunner.listLibraryFilterOptions,
		saveLibraryDisplayFilters:        libraryDisplaySettingsRunner.saveLibraryDisplayFilters,
	}),
);

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

interface TestStream<T> {
	cleanup: ReturnType<typeof vi.fn>;
	emit: (event: T) => void;
	stream$: Observable<T>;
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

function createTestStream<T>(): TestStream<T> {
	let listener: ((event: T) => void) | null = null;
	const cleanup                             = vi.fn(() => {
		listener = null;
	});

	return {
		cleanup,
		emit:    (event: T) => {
			listener?.(event);
		},
		stream$: new Observable<T>((subscriber) => {
			listener = (event) => subscriber.next(event);
			return cleanup;
		}),
	};
}

const defaultFilters: LibraryDisplayFilters = {
	adultFilter: "mixed",
	displayMode: "groups",
	genreNames:  [],
	tagNames:    [],
};

const filterOptions: LibraryFilterOptions = {
	genreNames: [ "Action" ],
	tagNames:   [ "Found Family" ],
};

function mockInitialSettings(
	adultContentEnabled: boolean,
	filters: LibraryDisplayFilters = defaultFilters,
): void {
	libraryDisplaySettingsRunner.getLibraryAdultContentStatus.mockResolvedValue(adultContentEnabled);
	libraryDisplaySettingsRunner.getLibraryDisplayFilters.mockResolvedValue(filters);
	libraryDisplaySettingsRunner.listLibraryFilterOptions.mockResolvedValue(filterOptions);
	libraryDisplaySettingsRunner.saveLibraryDisplayFilters.mockResolvedValue(undefined);
	libraryDisplaySettingsRunner.libraryAdultContentStatusChanges.mockReturnValue(EMPTY);
	vi.spyOn(
		message,
		"error",
	).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
}

describe(
	"useLibraryDisplaySettings",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.clearAllMocks();
			vi.restoreAllMocks();
		});

		it(
			"normalizes persisted adult and metadata filters when adult content is disabled",
			async () => {
				const requestWallReload = vi.fn();
				mockInitialSettings(
					false,
					{
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [ "Ecchi" ],
						tagNames:    [ "Nudity" ],
					},
				);
				const { result } = renderHook(() => useLibraryDisplaySettings({ requestWallReload }));

				await waitForAssertion(() => {
					expect(result.current.isAdultContentEnabled).toBe(false);
					expect(result.current.adultFilter).toBe("mixed");
					expect(result.current.displayMode).toBe("rawMedia");
					expect(result.current.filterOptions).toEqual(filterOptions);
					expect(requestWallReload).toHaveBeenCalledTimes(1);
					expect(libraryDisplaySettingsRunner.saveLibraryDisplayFilters).toHaveBeenCalledWith({
						adultFilter: "mixed",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					});
				});
			},
		);

		it(
			"surfaces persistence failures instead of swallowing filter writes",
			async () => {
				const requestWallReload = vi.fn();
				mockInitialSettings(
					true,
					defaultFilters,
				);
				const { result } = renderHook(() => useLibraryDisplaySettings({ requestWallReload }));

				await waitForAssertion(() => {
					expect(requestWallReload).toHaveBeenCalledTimes(1);
				});

				libraryDisplaySettingsRunner.saveLibraryDisplayFilters.mockRejectedValueOnce(new Error("filter write failed"));

				flushSync(() => {
					result.current.handleDisplayModeChange("rawMedia");
				});

				expect(result.current.displayMode).toBe("rawMedia");
				await waitForAssertion(() => {
					expect(message.error).toHaveBeenCalledWith("filter write failed");
				});
			},
		);

		it(
			"falls back to default state and reloads the wall when initial settings fail",
			async () => {
				const requestWallReload = vi.fn();
				mockInitialSettings(
					true,
					defaultFilters,
				);
				libraryDisplaySettingsRunner.getLibraryAdultContentStatus.mockRejectedValueOnce(new Error("settings load failed"));
				const { result } = renderHook(() => useLibraryDisplaySettings({ requestWallReload }));

				await waitForAssertion(() => {
					expect(result.current.isAdultContentEnabled).toBe(false);
					expect(result.current.adultFilter).toBe("mixed");
					expect(result.current.displayMode).toBe("groups");
					expect(message.error).toHaveBeenCalledWith("settings load failed");
					expect(requestWallReload).toHaveBeenCalledTimes(1);
				});
			},
		);

		it(
			"normalizes adult filters when adult content is disabled after initial load",
			async () => {
				const requestWallReload = vi.fn();
				const adultChanges$     = new Subject<boolean>();
				mockInitialSettings(
					true,
					{
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					},
				);
				libraryDisplaySettingsRunner.libraryAdultContentStatusChanges.mockReturnValue(adultChanges$);
				const { result } = renderHook(() => useLibraryDisplaySettings({ requestWallReload }));

				await waitForAssertion(() => {
					expect(result.current.isAdultContentEnabled).toBe(true);
					expect(result.current.adultFilter).toBe("adult");
					expect(result.current.displayMode).toBe("rawMedia");
					expect(requestWallReload).toHaveBeenCalledTimes(1);
				});

				flushSync(() => {
					adultChanges$.next(false);
				});

				await waitForAssertion(() => {
					expect(result.current.isAdultContentEnabled).toBe(false);
					expect(result.current.adultFilter).toBe("mixed");
					expect(requestWallReload).toHaveBeenCalledTimes(2);
					expect(libraryDisplaySettingsRunner.saveLibraryDisplayFilters).toHaveBeenCalledWith({
						adultFilter: "mixed",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					});
				});
			},
		);

		it(
			"unsubscribes adult-content status changes on unmount",
			async () => {
				const requestWallReload = vi.fn();
				const adultChanges      = createTestStream<boolean>();
				mockInitialSettings(
					true,
					defaultFilters,
				);
				libraryDisplaySettingsRunner.libraryAdultContentStatusChanges.mockReturnValue(adultChanges.stream$);

				const { unmount } = renderHook(() => useLibraryDisplaySettings({ requestWallReload }));

				await waitForAssertion(() => {
					expect(requestWallReload).toHaveBeenCalledTimes(1);
				});

				unmount();
				expect(adultChanges.cleanup).toHaveBeenCalledTimes(1);

				adultChanges.emit(false);
				expect(requestWallReload).toHaveBeenCalledTimes(1);
			},
		);
	},
);
