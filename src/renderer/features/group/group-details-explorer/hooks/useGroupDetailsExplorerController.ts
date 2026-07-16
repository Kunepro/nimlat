import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useLocation,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	useCallback,
	useMemo,
} from "react";
import { ROUTES } from "../../../../constants/route-config";
import { readRouteHistoryState } from "../../../../types/router-history-state";
import {
	createGroupWatchedSummary,
	type GroupWatchedSummary,
	resolveGroupDetailsRef,
} from "../group-details-explorer-model";
import { useGroupDetailsHeader } from "./useGroupDetailsHeader";
import { useGroupDetailsInspection } from "./useGroupDetailsInspection";
import { useGroupDetailsMutations } from "./useGroupDetailsMutations";

interface GroupDetailsExplorerController {
	groupId: string;
	groupSource: string;
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	isLoading: boolean;
	errorMessage: string | null;
	watchedSummary: GroupWatchedSummary;
	isUpdatingWatchedState: boolean;
	handleGroupWatchedToggle: () => void;
}

export function useGroupDetailsExplorerController(): GroupDetailsExplorerController {
	const {
					groupId,
					groupSource,
				}          = useParams({ from: ROUTES.GROUPS.GROUP.FULL_ID });
	const { state }  = useLocation();
	const navigate   = useNavigate();
	const routeState = readRouteHistoryState(state);

	const groupRef       = useMemo<GroupRef | null>(
		() => resolveGroupDetailsRef(
			groupSource,
			groupId,
		),
		[
			groupId,
			groupSource,
		],
	);
	const onBack         = useCallback(
		() => {
			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);
	const {
					group,
					isLoading,
					errorMessage,
					refreshGroupInspection,
					restoreGroupSnapshot,
					setAllMediaWatchedSnapshot,
				}              = useGroupDetailsInspection(groupRef);
	const watchedSummary = useMemo(
		() => createGroupWatchedSummary(group),
		[ group ],
	);
	const {
					isUpdatingWatchedState,
					isUpdatingIntegrationStatus,
					handleGroupWatchedToggle,
					handleGroupIntegrationStatusChange,
				}              = useGroupDetailsMutations({
		group,
		groupRef,
		watchedSummary,
		refreshGroupInspection,
		restoreGroupSnapshot,
		setAllMediaWatchedSnapshot,
	});
	useGroupDetailsHeader({
		groupId,
		groupSource,
		initialGroupName:               routeState.groupName,
		group,
		groupRef,
		isUpdatingIntegrationStatus,
		onBack,
		onGroupIntegrationStatusChange: handleGroupIntegrationStatusChange,
	});

	return {
		groupId,
		groupSource,
		group,
		groupRef,
		isLoading,
		errorMessage,
		watchedSummary,
		isUpdatingWatchedState,
		handleGroupWatchedToggle,
	};
}
