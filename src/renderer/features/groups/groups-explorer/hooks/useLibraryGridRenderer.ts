import type {
	LibraryDisplayFilters,
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useMemo,
	useRef,
} from "react";
import {
	createLibraryMediaWallDataSource,
	mapLibraryDisplayItemToMediaWallItem,
	PixiMediaWallRenderer,
} from "../../../../media-wall";
import type { MediaWallTerminalAction } from "../../../../types/media-wall";
import {
	applyLibraryWatchOverride,
	createLibraryVisualStateKey,
	getLibraryMenuActions,
	getLibraryMenuMeta,
} from "../library-grid-model";

interface UseLibraryGridRendererOptions {
	deletingKeys: Set<string>;
	filters: LibraryDisplayFilters;
	refreshingKeys: Set<string>;
	scope: LibraryDisplayScope;
	updatingStatusKeys: Set<string>;
	watchStateOverrides: ReadonlyMap<string, boolean>;
}

export interface LibraryGridRendererState {
	dataSource: ReturnType<typeof createLibraryMediaWallDataSource>;
	getMenuActions: (item: LibraryDisplayItem) => MediaWallTerminalAction[];
	renderer: PixiMediaWallRenderer<LibraryDisplayItem>;
	visualStateKey: string;
}

// Pixi renderer instances are intentionally stable per scope. Mutable refs let
// card mapping observe current visual state without forcing renderer recreation.
export function useLibraryGridRenderer({
																				 deletingKeys,
																				 filters,
																				 refreshingKeys,
																				 scope,
																				 updatingStatusKeys,
																				 watchStateOverrides,
																			 }: UseLibraryGridRendererOptions): LibraryGridRendererState {
	const watchStateOverridesRef   = useRef(watchStateOverrides);
	watchStateOverridesRef.current = watchStateOverrides;
	const updatingStatusKeysRef    = useRef(updatingStatusKeys);
	const deletingKeysRef          = useRef(deletingKeys);
	const refreshingKeysRef        = useRef(refreshingKeys);
	updatingStatusKeysRef.current  = updatingStatusKeys;
	deletingKeysRef.current        = deletingKeys;
	refreshingKeysRef.current      = refreshingKeys;

	const dataSource     = useMemo(
		() => createLibraryMediaWallDataSource(
			scope,
			filters,
		),
		[
			filters,
			scope,
		],
	);
	const renderer       = useMemo(
		() => new PixiMediaWallRenderer<LibraryDisplayItem>({
			mapItem: (item) => {
				const effectiveItem = applyLibraryWatchOverride(
					item,
					watchStateOverridesRef.current,
				);
				return {
					...mapLibraryDisplayItemToMediaWallItem(
						effectiveItem,
						scope,
					),
					integrationStatusUpdating: updatingStatusKeysRef.current.has(effectiveItem.key),
					menuActions:               getLibraryMenuActions(
						effectiveItem,
						updatingStatusKeysRef.current,
						deletingKeysRef.current,
						refreshingKeysRef.current,
					),
					menuMeta:                  getLibraryMenuMeta(effectiveItem),
				};
			},
		}),
		[ scope ],
	);
	const visualStateKey = useMemo(
		() => createLibraryVisualStateKey({
			watchStateOverrides,
			updatingStatusKeys,
			deletingKeys,
			refreshingKeys,
		}),
		[
			deletingKeys,
			refreshingKeys,
			updatingStatusKeys,
			watchStateOverrides,
		],
	);
	const getMenuActions = useCallback(
		(item: LibraryDisplayItem) => getLibraryMenuActions(
			item,
			updatingStatusKeysRef.current,
			deletingKeysRef.current,
			refreshingKeysRef.current,
		),
		[],
	);

	return {
		dataSource,
		getMenuActions,
		renderer,
		visualStateKey,
	};
}
