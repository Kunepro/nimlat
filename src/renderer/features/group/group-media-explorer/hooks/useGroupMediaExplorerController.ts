import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	GroupInspectionMediaCard,
	GroupInspectionSummary,
} from "@nimlat/types/ipc-payloads";
import type { MediaWallLoadedRange } from "@nimlat/types/media-wall";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useLocation,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { ROUTES } from "../../../../constants/route-config";
import { useOpenEditMediaModal } from "../../../../modals/edit-media/edit-media-modal.state";
import { readRouteHistoryState } from "../../../../types/router-history-state";
import { resolveGroupMediaExplorerRef } from "../group-media-explorer-model";
import { useGroupMediaMutations } from "./useGroupMediaMutations";
import { useGroupMediaRangeState } from "./useGroupMediaRangeState";
import { useGroupMediaSelection } from "./useGroupMediaSelection";
import { useGroupMediaSubscriptions } from "./useGroupMediaSubscriptions";
import { useGroupMediaSummary } from "./useGroupMediaSummary";

interface UseGroupMediaExplorerControllerResult {
	groupId: string;
	groupSource: string;
	initialGroupName: string | undefined;
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	isLoadingSummary: boolean;
	summaryErrorMessage: string | null;
	hasLoadedMediaRange: boolean;
	mediaRangeErrorMessage: string | null;
	totalMediaItems: number;
	wallReloadKey: number | undefined;
	selectedMediaIds: Set<number>;
	selectedMediaCount: number;
	watchStateOverrides: ReadonlyMap<number, boolean>;
	isUpdatingGroupIntegrationStatus: boolean;
	notificationContextHolder: ReactNode;
	onBack: () => void;
	handleGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleMediaIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
	handleRangeLoaded: (range: MediaWallLoadedRange<GroupInspectionMediaCard>) => void;
	handleRangeLoadError: (error: unknown) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
	toggleMediaSelection: (media: GroupInspectionMediaCard, selected: boolean) => void;
	refreshMedia: (mediaId: number) => Promise<void>;
	editMedia: (media: GroupInspectionMediaCard) => void;
	removeSingleMedia: (media: GroupInspectionMediaCard) => void;
	removeSelectedMedias: () => void;
	handleWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
}

export function useGroupMediaExplorerController(): UseGroupMediaExplorerControllerResult {
	const {
					groupId,
					groupSource,
				}                  = useParams({ from: ROUTES.GROUPS.GROUP.FULL_ID });
	const { state }          = useLocation();
	const navigate           = useNavigate();
	const openEditMediaModal = useOpenEditMediaModal();
	const routeState         = readRouteHistoryState(state);

	const groupRef = useMemo<GroupRef | null>(
		() => resolveGroupMediaExplorerRef(
			groupSource,
			groupId,
		),
		[
			groupId,
			groupSource,
		],
	);
	const {
					hasLoadedMediaRange,
					mediaRangeErrorMessage,
					totalMediaItems,
					loadedMediaIds,
					wallReloadKey,
					decrementTotalMediaItems,
					handleRangeLoaded,
					handleRangeLoadError,
					requestWallReload,
					resetMediaRange,
				}        = useGroupMediaRangeState();
	const {
					selectedMediaIds,
					selectedMedias,
					selectedMediaCount,
					clearMediaSelection,
					patchSelectedMedias,
					removeSelectedMediasFromState,
					toggleMediaSelection,
				}        = useGroupMediaSelection();
	const {
					group,
					isLoadingSummary,
					summaryErrorMessage,
					loadSummary,
				}        = useGroupMediaSummary(groupRef);
	useEffect(
		() => {
			clearMediaSelection();
			resetMediaRange();
		},
		[
			clearMediaSelection,
			groupRef,
			resetMediaRange,
		],
	);
	const {
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
				} = useGroupMediaMutations({
		group,
		groupRef,
		groupSource,
		selectedMedias,
		decrementTotalMediaItems,
		loadSummary,
		removeSelectedMediasFromState,
		requestWallReload,
	});
	useGroupMediaSubscriptions({
		applyWatchStatePatches,
		groupRef,
		loadedMediaIds,
		loadSummary,
		patchSelectedMedias,
		requestWallReload,
	});

	const onBack = useCallback(
		() => {
			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);

	const editMedia = useCallback(
		(media: GroupInspectionMediaCard) => {
			openEditMediaModal({
				mediaId:            media.mediaId,
				initialName:        media.name,
				initialDescription: media.description || "",
			});
		},
		[ openEditMediaModal ],
	);

	return {
		groupId,
		groupSource,
		initialGroupName: routeState.groupName,
		group,
		groupRef,
		isLoadingSummary,
		summaryErrorMessage,
		hasLoadedMediaRange,
		mediaRangeErrorMessage,
		totalMediaItems,
		wallReloadKey,
		selectedMediaIds,
		selectedMediaCount,
		watchStateOverrides,
		isUpdatingGroupIntegrationStatus,
		notificationContextHolder,
		onBack,
		handleGroupIntegrationStatusChange,
		handleMediaIntegrationStatusChange,
		handleRangeLoaded,
		handleRangeLoadError,
		requestWallReload,
		toggleMediaSelection,
		refreshMedia,
		editMedia,
		removeSingleMedia,
		removeSelectedMedias,
		handleWatchStateChange,
	};
}
