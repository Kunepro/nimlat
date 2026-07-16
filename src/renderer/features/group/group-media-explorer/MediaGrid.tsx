import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useCallback } from "react";
import { PixiMediaWallHost } from "../../../media-wall";
import type {
	MediaWallLoadedRange,
	MediaWallProjectorOverlayItem,
} from "../../../types/media-wall";
import GroupMediaGridProjectorOverlay from "./components/GroupMediaGridProjectorOverlay";
import { useGroupMediaGridController } from "./hooks/useGroupMediaGridController";

export interface MediaGridProps {
	group: GroupRef;
	groupName: string;
	dataKey: string;
	className?: string;
	reloadKey?: number;
	selectedMediaIds: Set<number>;
	watchStateOverrides: ReadonlyMap<number, boolean>;
	onRangeLoaded: (range: MediaWallLoadedRange<GroupInspectionMediaCard>) => void;
	onRangeLoadError: (error: unknown) => void;
	onToggleMediaSelection: (media: GroupInspectionMediaCard, selected: boolean) => void;
	onRefreshMedia: (mediaId: number) => Promise<void>;
	onEditMedia: (media: GroupInspectionMediaCard) => void;
	onRemoveMedia: (media: GroupInspectionMediaCard) => void;
	onIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
	onWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
}

const MediaGrid = ({
										 group,
										 groupName,
										 dataKey,
										 className,
										 reloadKey,
										 selectedMediaIds,
										 watchStateOverrides,
										 onRangeLoaded,
										 onRangeLoadError,
										 onToggleMediaSelection,
										 onRefreshMedia,
										 onEditMedia,
										 onRemoveMedia,
										 onIntegrationStatusChange,
										 onWatchStateChange,
									 }: MediaGridProps) => {
	const {
					dataSource,
					renderer,
					visualStateKey,
					getActiveItemAriaLabel,
					getItemSelected,
					getMenuActions,
					handleMenuAction,
					handleSelectionToggle,
					handleWatchStateToggle,
					openMedia,
				}                      = useGroupMediaGridController({
		group,
		groupName,
		selectedMediaIds,
		watchStateOverrides,
		onToggleMediaSelection,
		onRefreshMedia,
		onEditMedia,
		onRemoveMedia,
		onIntegrationStatusChange,
		onWatchStateChange,
	});
	const renderProjectorOverlay = useCallback(
		(activeItem: MediaWallProjectorOverlayItem<GroupInspectionMediaCard>) => (
			<GroupMediaGridProjectorOverlay
				activeItem={ activeItem }
				onIntegrationStatusChange={ onIntegrationStatusChange }
			/>
		),
		[ onIntegrationStatusChange ],
	);

	return (
		<PixiMediaWallHost
			ariaLabel="Group titles media wall"
			dataKey={ dataKey }
			dataSource={ dataSource }
			search=""
			className={ className }
			testId="group-media-wall"
			reloadKey={ reloadKey }
			visualStateKey={ visualStateKey }
			renderer={ renderer }
			getItemAriaLabel={ getActiveItemAriaLabel }
			getItemSelected={ getItemSelected }
			getItemMenuActions={ getMenuActions }
			renderProjectorOverlay={ renderProjectorOverlay }
			onOpenItem={ openMedia }
			onMenuAction={ handleMenuAction }
			onSelectionToggle={ handleSelectionToggle }
			onWatchStateToggle={ handleWatchStateToggle }
			onRangeLoaded={ onRangeLoaded }
			onRangeLoadError={ onRangeLoadError }
		/>
	);
};

export default MediaGrid;
