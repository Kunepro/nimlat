// @vitest-environment jsdom

import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import message from "antd/es/message";
import {
	createElement,
	type ReactElement,
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
import { GroupExplorerFacade } from "../../../../facades";
import { useLibraryItemIntegrationActions } from "./useLibraryItemIntegrationActions";

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

function createMediaItem(
	mediaId: number,
	overrides: Partial<LibraryDisplayItem> = {},
): LibraryDisplayItem {
	return {
		key:         `media:${ mediaId }`,
		kind:        "media",
		name:        `Media ${ mediaId }`,
		mediaId,
		lastRefresh: "",
		...overrides,
	};
}

function renderIntegrationActions(options: {
	isIgnoredScope?: boolean;
	selectedItems?: LibraryDisplayItem[];
} = {}) {
	const onVisibleItemsRemoved = vi.fn();
	const removeSelectedKeys    = vi.fn();
	const requestWallReload     = vi.fn();
	const updateSelectedItem    = vi.fn();
	const renderedHook          = renderHook(() => useLibraryItemIntegrationActions({
		isIgnoredScope: options.isIgnoredScope ?? false,
		selectedItems:  options.selectedItems ?? [],
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
		updateSelectedItem,
	}));

	return {
		...renderedHook,
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
		updateSelectedItem,
	};
}

describe(
	"useLibraryItemIntegrationActions",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"reconciles successful items when ignoring a selected batch partially fails",
			async () => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockImplementation(request => Promise.resolve(request.mediaId === 1
					? { success: true }
					: {
						success: false,
						error:   "write failed",
					}));
				const successfulItem = createMediaItem(
					1,
					{ name: "Planetes" },
				);
				const failedItem     = createMediaItem(
					2,
					{ name: "Cowboy Bebop" },
				);
				const {
								result,
								onVisibleItemsRemoved,
								removeSelectedKeys,
								requestWallReload,
							}              = renderIntegrationActions({
					selectedItems: [
						successfulItem,
						failedItem,
					],
				});

				await result.current.handleIgnoreSelectedItems();

				await waitForAssertion(() => {
					expect(result.current.isIgnoringSelected).toBe(false);
					expect(result.current.updatingStatusKeySet.size).toBe(0);
				});
				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledTimes(2);
				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           1,
					integrationStatus: "ignored",
				});
				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           2,
					integrationStatus: "ignored",
				});
				expect(removeSelectedKeys).toHaveBeenCalledWith(new Set([ successfulItem.key ]));
				expect(onVisibleItemsRemoved).toHaveBeenCalledWith(1);
				expect(requestWallReload).toHaveBeenCalledTimes(1);
				expect(message.error).toHaveBeenCalledWith("Failed to ignore 1 item: Cowboy Bebop: write failed.");
			},
		);

		it(
			"updates the selected item when a status change stays in the current scope",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				const item = createMediaItem(1);
				const {
								result,
								removeSelectedKeys,
								requestWallReload,
								updateSelectedItem,
							}    = renderIntegrationActions();

				await result.current.handleIntegrationStatusChange(
					item,
					"tracked",
				);

				expect(updateSelectedItem).toHaveBeenCalledWith({
					...item,
					integrationStatus: "tracked",
				});
				expect(removeSelectedKeys).not.toHaveBeenCalled();
				expect(requestWallReload).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"removes the selected item when a status change leaves the current scope",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				const item = createMediaItem(1);
				const {
								result,
								onVisibleItemsRemoved,
								removeSelectedKeys,
								requestWallReload,
								updateSelectedItem,
							}    = renderIntegrationActions();

				await result.current.handleIntegrationStatusChange(
					item,
					"ignored",
				);

				expect(removeSelectedKeys).toHaveBeenCalledWith(new Set([ item.key ]));
				expect(onVisibleItemsRemoved).toHaveBeenCalledWith(1);
				expect(updateSelectedItem).not.toHaveBeenCalled();
				expect(requestWallReload).toHaveBeenCalledTimes(1);
			},
		);
	},
);
