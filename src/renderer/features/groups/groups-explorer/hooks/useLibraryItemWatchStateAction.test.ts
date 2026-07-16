// @vitest-environment jsdom

import type {
	LibraryDisplayItem,
	MediaWatchStateActionResult,
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
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../../../facades";
import { useLibraryItemWatchStateAction } from "./useLibraryItemWatchStateAction";

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

function createMediaItem(overrides: Partial<LibraryDisplayItem> = {}): LibraryDisplayItem {
	return {
		key:         "media:1",
		kind:        "media",
		name:        "Planetes",
		mediaId:     1,
		isWatched:   false,
		lastRefresh: "",
		...overrides,
	};
}

function renderWatchStateAction() {
	const requestWallReload  = vi.fn();
	const updateSelectedItem = vi.fn();
	const renderedHook       = renderHook(() => useLibraryItemWatchStateAction({
		requestWallReload,
		updateSelectedItem,
	}));

	return {
		...renderedHook,
		requestWallReload,
		updateSelectedItem,
	};
}

describe(
	"useLibraryItemWatchStateAction",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"applies optimistic watched state and reloads the wall after persistence succeeds",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 1 ],
				});
				const {
								result,
								requestWallReload,
								updateSelectedItem,
							}    = renderWatchStateAction();
				const item = createMediaItem();

				await result.current.handleWatchStateChange(
					item,
					true,
				);

				await waitForAssertion(() => {
					expect(updateSelectedItem).toHaveBeenCalledWith({
						...item,
						isWatched: true,
					});
					expect(result.current.watchStateOverrides.get(item.key)).toBe(true);
				});
				expect(GroupExplorerFacade.setMediaWatchState).toHaveBeenCalledWith({
					mediaIds:  [ 1 ],
					isWatched: true,
				});
				expect(requestWallReload).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"rolls back wall and selected-item watched state when persistence fails",
			async () => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success: false,
					error:   "write failed",
				});
				const {
								result,
								requestWallReload,
								updateSelectedItem,
							}    = renderWatchStateAction();
				const item = createMediaItem();

				await result.current.handleWatchStateChange(
					item,
					true,
				);

				await waitForAssertion(() => {
					expect(updateSelectedItem).toHaveBeenNthCalledWith(
						1,
						{
							...item,
							isWatched: true,
						},
					);
					expect(updateSelectedItem).toHaveBeenNthCalledWith(
						2,
						{
							...item,
							isWatched: false,
						},
					);
					expect(result.current.watchStateOverrides.get(item.key)).toBe(false);
				});
				expect(message.error).toHaveBeenCalledWith("write failed");
				expect(requestWallReload).not.toHaveBeenCalled();
			},
		);

		it(
			"does not let an older failed toggle rollback a newer optimistic state",
			async () => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
				const firstWrite = createDeferred<MediaWatchStateActionResult>();
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				)
					.mockReturnValueOnce(firstWrite.promise)
					.mockResolvedValueOnce({
						success:         true,
						changedMediaIds: [ 1 ],
					});
				const {
								result,
								updateSelectedItem,
							}    = renderWatchStateAction();
				const item = createMediaItem();

				void result.current.handleWatchStateChange(
					item,
					true,
				);
				await waitForAssertion(() => {
					expect(result.current.watchStateOverrides.get(item.key)).toBe(true);
				});

				await result.current.handleWatchStateChange(
					item,
					false,
				);
				await waitForAssertion(() => {
					expect(result.current.watchStateOverrides.get(item.key)).toBe(false);
				});

				firstWrite.resolve({
					success: false,
					error:   "first write failed",
				});
				await waitForAssertion(() => {
					expect(message.error).toHaveBeenCalledWith("first write failed");
				});

				expect(result.current.watchStateOverrides.get(item.key)).toBe(false);
				expect(updateSelectedItem).toHaveBeenLastCalledWith({
					...item,
					isWatched: false,
				});
			},
		);
	},
);
