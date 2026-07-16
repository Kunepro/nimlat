import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	createGroupMediaWallDataSource,
	PixiMediaWallRenderer,
} from "../../../../media-wall";
import type { MediaWallTerminalAction } from "../../../../types/media-wall";
import { useGroupMediaGridItemInteractions } from "./useGroupMediaGridItemInteractions";
import { useGroupMediaGridNavigation } from "./useGroupMediaGridNavigation";
import { useGroupMediaWallRenderer } from "./useGroupMediaWallRenderer";

interface GroupMediaGridControllerOptions {
	group: GroupRef;
	groupName: string;
	selectedMediaIds: Set<number>;
	watchStateOverrides: ReadonlyMap<number, boolean>;
	onToggleMediaSelection: (media: GroupInspectionMediaCard, selected: boolean) => void;
	onRefreshMedia: (mediaId: number) => Promise<void>;
	onEditMedia: (media: GroupInspectionMediaCard) => void;
	onRemoveMedia: (media: GroupInspectionMediaCard) => void;
	onIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
	onWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
}

interface GroupMediaGridController {
	dataSource: ReturnType<typeof createGroupMediaWallDataSource>;
	renderer: PixiMediaWallRenderer<GroupInspectionMediaCard>;
	visualStateKey: string;
	getActiveItemAriaLabel: (item: GroupInspectionMediaCard) => string;
	getItemSelected: (item: GroupInspectionMediaCard) => boolean;
	getMenuActions: (media: GroupInspectionMediaCard) => MediaWallTerminalAction[];
	handleMenuAction: (media: GroupInspectionMediaCard, index: number, actionId: string) => Promise<void>;
	handleSelectionToggle: (media: GroupInspectionMediaCard) => void;
	handleWatchStateToggle: (media: GroupInspectionMediaCard) => void;
	openMedia: (media: GroupInspectionMediaCard) => void;
}

export function useGroupMediaGridController({
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
																						}: GroupMediaGridControllerOptions): GroupMediaGridController {
	const {
					dataSource,
					renderer,
					visualStateKey,
				}         = useGroupMediaWallRenderer(
		group,
		watchStateOverrides,
	);
	const openMedia = useGroupMediaGridNavigation(
		group,
		groupName,
	);
	const {
					getActiveItemAriaLabel,
					getItemSelected,
					getMenuActions,
					handleMenuAction,
					handleSelectionToggle,
					handleWatchStateToggle,
				}         = useGroupMediaGridItemInteractions({
		selectedMediaIds,
		watchStateOverrides,
		onToggleMediaSelection,
		onRefreshMedia,
		onEditMedia,
		onRemoveMedia,
		onIntegrationStatusChange,
		onWatchStateChange,
	});

	return {
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
	};
}
