import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	LibraryDisplayFilters,
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import { useCallback } from "react";
import { PixiMediaWallHost } from "../../../media-wall";
import type { MediaWallProjectorOverlayItem } from "../../../types/media-wall";
import LibraryGridProjectorOverlay from "./components/library-grid/LibraryGridProjectorOverlay";
import { useLibraryGridController } from "./hooks/useLibraryGridController";

export interface LibraryGridProps {
	scope: LibraryDisplayScope;
	search: string;
	filters: LibraryDisplayFilters;
	dataKey: string;
	className?: string;
	reloadKey?: number;
	selectedKeys: Set<string>;
	updatingStatusKeys: Set<string>;
	watchStateOverrides: ReadonlyMap<string, boolean>;
	deletingKeys: Set<string>;
	refreshingKeys: Set<string>;
	onRangeLoaded: (rangeTotal: number) => void;
	onRangeLoadError: (error: unknown) => void;
	onOpenItem: (item: LibraryDisplayItem) => void;
	onToggleSelected: (item: LibraryDisplayItem) => void;
	onEditItem: (item: LibraryDisplayItem) => void;
	onDeleteGroup: (item: LibraryDisplayItem) => Promise<void>;
	onRefreshItem: (item: LibraryDisplayItem) => Promise<void>;
	onIntegrationStatusChange: (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => Promise<void>;
	onWatchStateChange: (item: LibraryDisplayItem, nextWatched: boolean) => Promise<void>;
}

const LibraryGrid: FC<LibraryGridProps> = ({
																						 scope,
																						 search,
																						 filters,
																						 dataKey,
																						 className,
																						 reloadKey,
																						 selectedKeys,
																						 updatingStatusKeys,
																						 watchStateOverrides,
																						 deletingKeys,
																						 refreshingKeys,
																						 onRangeLoaded,
																						 onRangeLoadError,
																						 onOpenItem,
																						 onToggleSelected,
																						 onEditItem,
																						 onDeleteGroup,
																						 onRefreshItem,
																						 onIntegrationStatusChange,
																						 onWatchStateChange,
																					 }) => {
	const {
					dataSource,
					getActiveItemAriaLabel,
					getItemSelected,
					getMenuActions,
					handleMenuAction,
					handleSelectionToggle,
					handleWatchStateToggle,
					renderer,
					visualStateKey,
				}                      = useLibraryGridController({
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
	});
	const renderProjectorOverlay = useCallback(
		(activeItem: MediaWallProjectorOverlayItem<LibraryDisplayItem>) => (
			<LibraryGridProjectorOverlay
				activeItem={ activeItem }
				updatingStatusKeys={ updatingStatusKeys }
				onIntegrationStatusChange={ onIntegrationStatusChange }
			/>
		),
		[
			onIntegrationStatusChange,
			updatingStatusKeys,
		],
	);

	return (
		<PixiMediaWallHost
			ariaLabel={ scope === "ignored" ? "Ignored media wall" : "Library media wall" }
			dataKey={ dataKey }
			dataSource={ dataSource }
			search={ search }
			className={ className }
			testId={ scope === "ignored" ? "ignored-media-wall" : "library-media-wall" }
			reloadKey={ reloadKey }
			visualStateKey={ visualStateKey }
			renderer={ renderer }
			getItemAriaLabel={ getActiveItemAriaLabel }
			getItemSelected={ getItemSelected }
			getItemMenuActions={ getMenuActions }
			renderProjectorOverlay={ renderProjectorOverlay }
			onOpenItem={ onOpenItem }
			onMenuAction={ handleMenuAction }
			onSelectionToggle={ handleSelectionToggle }
			onWatchStateToggle={ handleWatchStateToggle }
			onRangeLoaded={ (range) => onRangeLoaded(range.total) }
			onRangeLoadError={ onRangeLoadError }
		/>
	);
};

export default LibraryGrid;
