import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import type { MediaWallTerminalAction } from "../../../../types/media-wall";
import {
	getGroupMediaAriaLabel,
	getGroupMediaMenuActions,
	getGroupMediaWatchedState,
	resolveGroupMediaMenuActionEffect,
} from "../group-media-grid-model";

interface GroupMediaGridItemInteractionsOptions {
	selectedMediaIds: Set<number>;
	watchStateOverrides: ReadonlyMap<number, boolean>;
	onToggleMediaSelection: (media: GroupInspectionMediaCard, selected: boolean) => void;
	onRefreshMedia: (mediaId: number) => Promise<void>;
	onEditMedia: (media: GroupInspectionMediaCard) => void;
	onRemoveMedia: (media: GroupInspectionMediaCard) => void;
	onIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
	onWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
}

interface GroupMediaGridItemInteractions {
	getActiveItemAriaLabel: (item: GroupInspectionMediaCard) => string;
	getItemSelected: (item: GroupInspectionMediaCard) => boolean;
	getMenuActions: (media: GroupInspectionMediaCard) => MediaWallTerminalAction[];
	handleMenuAction: (media: GroupInspectionMediaCard, index: number, actionId: string) => Promise<void>;
	handleSelectionToggle: (media: GroupInspectionMediaCard) => void;
	handleWatchStateToggle: (media: GroupInspectionMediaCard) => void;
}

export function useGroupMediaGridItemInteractions({
																										selectedMediaIds,
																										watchStateOverrides,
																										onToggleMediaSelection,
																										onRefreshMedia,
																										onEditMedia,
																										onRemoveMedia,
																										onIntegrationStatusChange,
																										onWatchStateChange,
																									}: GroupMediaGridItemInteractionsOptions): GroupMediaGridItemInteractions {
	const getActiveItemAriaLabel = useCallback(
		(item: GroupInspectionMediaCard) => getGroupMediaAriaLabel(item),
		[],
	);
	const getItemSelected        = useCallback(
		(item: GroupInspectionMediaCard) => selectedMediaIds.has(item.mediaId),
		[ selectedMediaIds ],
	);
	const getMenuActions         = useCallback(
		(media: GroupInspectionMediaCard) => getGroupMediaMenuActions(media),
		[],
	);
	const handleMenuAction       = useCallback(
		async (media: GroupInspectionMediaCard, _index: number, actionId: string) => {
			const effect = resolveGroupMediaMenuActionEffect(
				media,
				actionId,
			);

			switch (effect.type) {
				case "edit":
					onEditMedia(media);
					return;
				case "refresh":
					await onRefreshMedia(effect.mediaId);
					return;
				case "updateIntegrationStatus":
					await onIntegrationStatusChange(
						effect.mediaId,
						effect.nextStatus,
					);
					return;
				case "removeFromGroup":
					onRemoveMedia(media);
					return;
				case "none":
					return;
			}
		},
		[
			onEditMedia,
			onIntegrationStatusChange,
			onRefreshMedia,
			onRemoveMedia,
		],
	);
	const handleSelectionToggle  = useCallback(
		(media: GroupInspectionMediaCard) => {
			onToggleMediaSelection(
				media,
				!selectedMediaIds.has(media.mediaId),
			);
		},
		[
			onToggleMediaSelection,
			selectedMediaIds,
		],
	);
	const handleWatchStateToggle = useCallback(
		(media: GroupInspectionMediaCard) => {
			const currentWatched = getGroupMediaWatchedState(
				media,
				watchStateOverrides,
			);
			void onWatchStateChange(
				media,
				!currentWatched,
			);
		},
		[
			onWatchStateChange,
			watchStateOverrides,
		],
	);

	return {
		getActiveItemAriaLabel,
		getItemSelected,
		getMenuActions,
		handleMenuAction,
		handleSelectionToggle,
		handleWatchStateToggle,
	};
}
