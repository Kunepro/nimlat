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
import {
	GroupAssignmentsFacade,
	GroupExplorerFacade,
} from "../../../../facades";
import { useLibraryItemMaintenanceActions } from "./useLibraryItemMaintenanceActions";

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

function createGroupItem(overrides: Partial<LibraryDisplayItem> = {}): LibraryDisplayItem {
	return {
		key:         "group:official:1",
		kind:        "group",
		name:        "Group 1",
		lastRefresh: "",
		group:       {
			source:  "official",
			groupId: 1,
		},
		...overrides,
	};
}

function renderMaintenanceActions() {
	const onVisibleItemsRemoved = vi.fn();
	const removeSelectedKeys    = vi.fn();
	const requestWallReload     = vi.fn();
	const renderedHook          = renderHook(() => useLibraryItemMaintenanceActions({
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
	}));

	return {
		...renderedHook,
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
	};
}

describe(
	"useLibraryItemMaintenanceActions",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"refreshes media items and reloads the wall after persistence succeeds",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"refreshMedia",
				).mockResolvedValue({ success: true });
				const {
								result,
								requestWallReload,
							}    = renderMaintenanceActions();
				const item = createMediaItem(1);

				await result.current.handleRefreshItem(item);

				expect(GroupExplorerFacade.refreshMedia).toHaveBeenCalledWith(1);
				expect(requestWallReload).toHaveBeenCalledTimes(1);
				await waitForAssertion(() => {
					expect(result.current.refreshingKeySet.size).toBe(0);
				});
			},
		);

		it(
			"does not reload the wall when an item has no refresh target",
			async () => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
				vi.spyOn(
					GroupExplorerFacade,
					"refreshMedia",
				);
				vi.spyOn(
					GroupExplorerFacade,
					"refreshGroup",
				);
				const {
								result,
								requestWallReload,
							}                        = renderMaintenanceActions();
				const item: LibraryDisplayItem = {
					key:         "media:missing",
					kind:        "media",
					name:        "Missing target",
					lastRefresh: "",
				};

				await result.current.handleRefreshItem(item);

				expect(message.error).toHaveBeenCalledWith("This item cannot be refreshed.");
				expect(GroupExplorerFacade.refreshMedia).not.toHaveBeenCalled();
				expect(GroupExplorerFacade.refreshGroup).not.toHaveBeenCalled();
				expect(requestWallReload).not.toHaveBeenCalled();
				await waitForAssertion(() => {
					expect(result.current.refreshingKeySet.size).toBe(0);
				});
			},
		);

		it(
			"deletes groups and removes only the deleted item from visible selection",
			async () => {
				vi.spyOn(
					GroupAssignmentsFacade,
					"deleteGroupManual",
				).mockResolvedValue({ success: true });
				const {
								result,
								onVisibleItemsRemoved,
								removeSelectedKeys,
								requestWallReload,
							}    = renderMaintenanceActions();
				const item = createGroupItem();

				await result.current.handleDeleteGroup(item);

				expect(GroupAssignmentsFacade.deleteGroupManual).toHaveBeenCalledWith({ group: item.group });
				expect(removeSelectedKeys).toHaveBeenCalledWith(new Set([ item.key ]));
				expect(onVisibleItemsRemoved).toHaveBeenCalledWith(1);
				expect(requestWallReload).toHaveBeenCalledTimes(1);
				await waitForAssertion(() => {
					expect(result.current.deletingKeySet.size).toBe(0);
				});
			},
		);

		it(
			"does not delete media items as groups",
			async () => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
				vi.spyOn(
					GroupAssignmentsFacade,
					"deleteGroupManual",
				);
				const {
								result,
								requestWallReload,
							} = renderMaintenanceActions();

				await result.current.handleDeleteGroup(createMediaItem(1));

				expect(message.error).toHaveBeenCalledWith("This item cannot be deleted as a group.");
				expect(GroupAssignmentsFacade.deleteGroupManual).not.toHaveBeenCalled();
				expect(requestWallReload).not.toHaveBeenCalled();
			},
		);
	},
);
