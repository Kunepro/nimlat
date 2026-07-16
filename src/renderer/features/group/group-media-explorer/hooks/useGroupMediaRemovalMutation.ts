import type {
	GroupInspectionMediaCard,
	GroupInspectionSummary,
} from "@nimlat/types/ipc-payloads";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	createEditableGroupNavigationTarget,
	shouldShowGroupMediaRemoveUndo,
} from "../group-media-explorer-model";
import {
	removeGroupMediaItem,
	restoreGroupMediaItem,
} from "../group-media-mutations-runner";

interface GroupMediaRemovalMutationOptions {
	group: GroupInspectionSummary | null;
	groupSource: string;
	selectedMedias: GroupInspectionMediaCard[];
	decrementTotalMediaItems: (count: number) => void;
	loadSummary: (showLoader?: boolean) => Promise<void>;
	notifyGroupMutationError: (errorMessage: string) => void;
	removeSelectedMediasFromState: (medias: GroupInspectionMediaCard[]) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
	showSingleRemoveUndo: (onUndo: () => void) => void;
}

interface GroupMediaRemovalMutationController {
	removeSelectedMedias: () => void;
	removeSingleMedia: (media: GroupInspectionMediaCard) => void;
}

export function useGroupMediaRemovalMutation({
																							 group,
																							 groupSource,
																							 selectedMedias,
																							 decrementTotalMediaItems,
																							 loadSummary,
																							 notifyGroupMutationError,
																							 removeSelectedMediasFromState,
																							 requestWallReload,
																							 showSingleRemoveUndo,
																						 }: GroupMediaRemovalMutationOptions): GroupMediaRemovalMutationController {
	const navigate = useNavigate();

	const navigateToEditableGroupIfNeeded = useCallback(
		() => {
			const target = createEditableGroupNavigationTarget(
				group,
				groupSource,
			);
			if (!target) {
				return;
			}
			void navigate(target);
		},
		[
			group,
			groupSource,
			navigate,
		],
	);

	const undoRemoveMedia = useCallback(
		async (media: GroupInspectionMediaCard) => {
			if (!group) {
				return;
			}

			const result = await restoreGroupMediaItem(
				group.groupId,
				media.mediaId,
			);
			if (!result.success) {
				notifyGroupMutationError(result.error);
				return;
			}
			void loadSummary(false);
			requestWallReload();
		},
		[
			group,
			loadSummary,
			notifyGroupMutationError,
			requestWallReload,
		],
	);

	const removeMedias = useCallback(
		async (mediasToRemove: GroupInspectionMediaCard[], allowUndo: boolean) => {
			if (!group) {
				return;
			}

			for (const media of mediasToRemove) {
				const result = await removeGroupMediaItem(
					group.groupId,
					media.mediaId,
				);
				if (!result.success) {
					notifyGroupMutationError(result.error);
					return;
				}
			}

			removeSelectedMediasFromState(mediasToRemove);
			decrementTotalMediaItems(mediasToRemove.length);
			navigateToEditableGroupIfNeeded();
			void loadSummary(false);
			requestWallReload();

			const undoableMedia = mediasToRemove[ 0 ];
			if (shouldShowGroupMediaRemoveUndo(
				allowUndo,
				mediasToRemove.length,
			) && undoableMedia) {
				showSingleRemoveUndo(() => {
					void undoRemoveMedia(undoableMedia);
				});
			}
		},
		[
			decrementTotalMediaItems,
			group,
			loadSummary,
			navigateToEditableGroupIfNeeded,
			notifyGroupMutationError,
			removeSelectedMediasFromState,
			requestWallReload,
			showSingleRemoveUndo,
			undoRemoveMedia,
		],
	);

	const removeSingleMedia = useCallback(
		(media: GroupInspectionMediaCard) => {
			void removeMedias(
				[ media ],
				true,
			);
		},
		[ removeMedias ],
	);

	const removeSelectedMedias = useCallback(
		() => {
			if (!group || selectedMedias.length === 0) {
				return;
			}

			if (selectedMedias.length <= 1) {
				void removeMedias(
					selectedMedias,
					true,
				);
				return;
			}

			void removeMedias(
				selectedMedias,
				false,
			);
		},
		[
			group,
			removeMedias,
			selectedMedias,
		],
	);

	return {
		removeSelectedMedias,
		removeSingleMedia,
	};
}
