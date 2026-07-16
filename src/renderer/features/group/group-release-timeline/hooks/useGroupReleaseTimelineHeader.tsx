import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useMemo } from "react";
import { useGroupsShellHeader } from "../../../groups/groups-shell/use-groups-shell-header";
import { resolveGroupShellHeaderTitle } from "../../group-shell-header-model";
import GroupCompletionHeader from "../../GroupCompletionHeader";
import GroupHeaderTrackingProjector from "../../GroupHeaderTrackingProjector";

interface GroupReleaseTimelineHeaderOptions {
	groupId: string;
	groupSource: string;
	initialGroupName: string | undefined;
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	isUpdatingIntegrationStatus: boolean;
	onBack: () => void;
	onGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export function useGroupReleaseTimelineHeader({
																								groupId,
																								groupSource,
																								initialGroupName,
																								group,
																								groupRef,
																								isUpdatingIntegrationStatus,
																								onBack,
																								onGroupIntegrationStatusChange,
																							}: GroupReleaseTimelineHeaderOptions): void {
	const headerRightContent  = useMemo(
		() => (
			<GroupCompletionHeader
				group={ group }
				groupRef={ groupRef }
			/>
		),
		[
			group,
			groupRef,
		],
	);
	const headerCenterContent = useMemo(
		() => (
			<GroupHeaderTrackingProjector
				groupId={ groupId }
				groupSource={ groupSource }
				groupRef={ groupRef }
				integrationStatus={ group?.integrationStatus }
				isUpdatingIntegrationStatus={ isUpdatingIntegrationStatus }
				onGroupIntegrationStatusChange={ onGroupIntegrationStatusChange }
			/>
		),
		[
			group?.integrationStatus,
			groupId,
			groupRef,
			groupSource,
			isUpdatingIntegrationStatus,
			onGroupIntegrationStatusChange,
		],
	);

	useGroupsShellHeader({
		title:         resolveGroupShellHeaderTitle({
			groupId,
			groupName: group?.name,
			initialGroupName,
		}),
		onBack,
		centerContent: headerCenterContent,
		rightContent:  headerRightContent,
	});
}
