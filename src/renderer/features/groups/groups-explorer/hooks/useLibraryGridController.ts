import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	LibraryDisplayFilters,
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import type { MediaWallTerminalAction } from "../../../../types/media-wall";
import {
	getLibraryItemAriaLabel,
	getLibraryItemWatchedState,
	getLibraryMenuActionIntent,
} from "../library-grid-model";
import {
	type LibraryGridRendererState,
	useLibraryGridRenderer,
} from "./useLibraryGridRenderer";

interface LibraryGridControllerOptions {
	scope: LibraryDisplayScope;
	filters: LibraryDisplayFilters;
	selectedKeys: Set<string>;
	updatingStatusKeys: Set<string>;
	watchStateOverrides: ReadonlyMap<string, boolean>;
	deletingKeys: Set<string>;
	refreshingKeys: Set<string>;
	onToggleSelected: (item: LibraryDisplayItem) => void;
	onEditItem: (item: LibraryDisplayItem) => void;
	onDeleteGroup: (item: LibraryDisplayItem) => Promise<void>;
	onRefreshItem: (item: LibraryDisplayItem) => Promise<void>;
	onIntegrationStatusChange: (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => Promise<void>;
	onWatchStateChange: (item: LibraryDisplayItem, nextWatched: boolean) => Promise<void>;
}

interface LibraryGridController {
	dataSource: LibraryGridRendererState["dataSource"];
	getActiveItemAriaLabel: (item: LibraryDisplayItem) => string;
	getItemSelected: (item: LibraryDisplayItem) => boolean;
	getMenuActions: (item: LibraryDisplayItem) => MediaWallTerminalAction[];
	handleMenuAction: (item: LibraryDisplayItem, index: number, actionId: string) => Promise<void>;
	handleSelectionToggle: (item: LibraryDisplayItem) => void;
	handleWatchStateToggle: (item: LibraryDisplayItem) => void;
	renderer: LibraryGridRendererState["renderer"];
	visualStateKey: string;
}

export function useLibraryGridController({
																					 scope,
																					 filters,
																					 selectedKeys,
																					 updatingStatusKeys,
																					 watchStateOverrides,
																					 deletingKeys,
																					 refreshingKeys,
																					 onToggleSelected,
																					 onEditItem,
																					 onDeleteGroup,
																					 onRefreshItem,
																					 onIntegrationStatusChange,
																					 onWatchStateChange,
																				 }: LibraryGridControllerOptions): LibraryGridController {
	const {
					dataSource,
					getMenuActions,
					renderer,
					visualStateKey,
				}                      = useLibraryGridRenderer({
		deletingKeys,
		filters,
		refreshingKeys,
		scope,
		updatingStatusKeys,
		watchStateOverrides,
	});
	const handleMenuAction       = useCallback(
		async (item: LibraryDisplayItem, _index: number, actionId: string) => {
			const intent = getLibraryMenuActionIntent(
				item,
				actionId,
			);
			switch (intent.type) {
				case "edit":
					onEditItem(item);
					break;
				case "refresh":
					await onRefreshItem(item);
					break;
				case "setIntegrationStatus":
					await onIntegrationStatusChange(
						item,
						intent.nextStatus,
					);
					break;
				case "deleteGroup":
					await onDeleteGroup(item);
					break;
				case "noop":
				default:
					break;
			}
		},
		[
			onDeleteGroup,
			onEditItem,
			onIntegrationStatusChange,
			onRefreshItem,
		],
	);
	const getActiveItemAriaLabel = useCallback(
		(item: LibraryDisplayItem) => getLibraryItemAriaLabel(item),
		[],
	);
	const getItemSelected        = useCallback(
		(item: LibraryDisplayItem) => selectedKeys.has(item.key),
		[ selectedKeys ],
	);
	const handleSelectionToggle  = useCallback(
		(item: LibraryDisplayItem) => {
			onToggleSelected(item);
		},
		[ onToggleSelected ],
	);
	const handleWatchStateToggle = useCallback(
		(item: LibraryDisplayItem) => {
			const currentWatched = getLibraryItemWatchedState(
				item,
				watchStateOverrides,
			);
			void onWatchStateChange(
				item,
				!currentWatched,
			);
		},
		[
			onWatchStateChange,
			watchStateOverrides,
		],
	);

	return {
		dataSource,
		getActiveItemAriaLabel,
		getItemSelected,
		getMenuActions,
		handleMenuAction,
		handleSelectionToggle,
		handleWatchStateToggle,
		renderer,
		visualStateKey,
	};
}
