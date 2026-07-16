import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	GroupInspectionMediaCard,
	GroupInspectionSummary,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { ReactNode } from "react";
import { useGroupIntegrationStatusMutation } from "./useGroupIntegrationStatusMutation";
import { useGroupMediaIntegrationStatusMutation } from "./useGroupMediaIntegrationStatusMutation";
import { useGroupMediaMutationNotifications } from "./useGroupMediaMutationNotifications";
import { useGroupMediaRefreshMutation } from "./useGroupMediaRefreshMutation";
import { useGroupMediaRemovalMutation } from "./useGroupMediaRemovalMutation";
import { useGroupMediaWatchStateMutation } from "./useGroupMediaWatchStateMutation";

interface GroupMediaMutationsOptions {
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	groupSource: string;
	selectedMedias: GroupInspectionMediaCard[];
	decrementTotalMediaItems: (count: number) => void;
	loadSummary: (showLoader?: boolean) => Promise<void>;
	removeSelectedMediasFromState: (medias: GroupInspectionMediaCard[]) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
}

interface GroupMediaMutationsController {
	isUpdatingGroupIntegrationStatus: boolean;
	notificationContextHolder: ReactNode;
	watchStateOverrides: ReadonlyMap<number, boolean>;
	applyWatchStatePatches: ReturnType<typeof useGroupMediaWatchStateMutation>["applyWatchStatePatches"];
	handleGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleMediaIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
	handleWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
	refreshMedia: (mediaId: number) => Promise<void>;
	removeSelectedMedias: () => void;
	removeSingleMedia: (media: GroupInspectionMediaCard) => void;
}

export function useGroupMediaMutations({
																				 group,
																				 groupRef,
																				 groupSource,
																				 selectedMedias,
																				 decrementTotalMediaItems,
																				 loadSummary,
																				 removeSelectedMediasFromState,
																				 requestWallReload,
																			 }: GroupMediaMutationsOptions): GroupMediaMutationsController {
	const {
					notificationContextHolder,
					notifyGroupMutationError,
					showSingleRemoveUndo,
				}                                      = useGroupMediaMutationNotifications();
	const {
					isUpdatingGroupIntegrationStatus,
					handleGroupIntegrationStatusChange,
				}                                      = useGroupIntegrationStatusMutation({
		groupRef,
		loadSummary,
		notifyGroupMutationError,
	});
	const { handleMediaIntegrationStatusChange } = useGroupMediaIntegrationStatusMutation({
		notifyGroupMutationError,
	});
	const {
					watchStateOverrides,
					applyWatchStatePatches,
					handleWatchStateChange,
				}                                      = useGroupMediaWatchStateMutation({
		groupRef,
		notifyGroupMutationError,
		requestWallReload,
	});
	const {
					removeSelectedMedias,
					removeSingleMedia,
				}                                      = useGroupMediaRemovalMutation({
		group,
		groupSource,
		selectedMedias,
		decrementTotalMediaItems,
		loadSummary,
		removeSelectedMediasFromState,
		requestWallReload,
		notifyGroupMutationError,
		showSingleRemoveUndo,
	});
	const { refreshMedia }                       = useGroupMediaRefreshMutation({ requestWallReload });

	return {
		isUpdatingGroupIntegrationStatus,
		notificationContextHolder,
		watchStateOverrides,
		applyWatchStatePatches,
		handleGroupIntegrationStatusChange,
		handleMediaIntegrationStatusChange,
		handleWatchStateChange,
		refreshMedia,
		removeSelectedMedias,
		removeSingleMedia,
	};
}
