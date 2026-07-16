import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
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
import { resolveGroupReleaseTimelineRef } from "../group-release-timeline-model";
import { useGroupReleaseTimelineData } from "./useGroupReleaseTimelineData";
import { useGroupReleaseTimelineHeader } from "./useGroupReleaseTimelineHeader";
import { useGroupReleaseTimelineIntegrationMutation } from "./useGroupReleaseTimelineIntegrationMutation";

interface GroupReleaseTimelineController {
	groupId: string;
	groupSource: string;
	groupName: string | undefined;
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	rows: GroupReleaseTimelineRow[];
	isLoading: boolean;
	errorMessage: string | null;
}

export function useGroupReleaseTimelineController(): GroupReleaseTimelineController {
	const {
					groupId,
					groupSource,
				}          = useParams({ from: ROUTES.GROUPS.GROUP.FULL_ID });
	const { state }  = useLocation();
	const navigate   = useNavigate();
	const routeState = readRouteHistoryState(state);
	const groupRef   = useMemo<GroupRef | null>(
		() => resolveGroupReleaseTimelineRef(
			groupSource,
			groupId,
		),
		[
			groupId,
			groupSource,
		],
	);
	const onBack     = useCallback(
		() => {
			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);
	const {
					group,
					rows,
					isLoading,
					errorMessage,
					patchGroupIntegrationStatus,
				}          = useGroupReleaseTimelineData(groupRef);
	const {
					isUpdatingIntegrationStatus,
					handleGroupIntegrationStatusChange,
				}          = useGroupReleaseTimelineIntegrationMutation({
		groupRef,
		patchGroupIntegrationStatus,
	});
	const groupName  = group?.name || routeState.groupName;

	useGroupReleaseTimelineHeader({
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
		groupName,
		group,
		groupRef,
		rows,
		isLoading,
		errorMessage,
	};
}
