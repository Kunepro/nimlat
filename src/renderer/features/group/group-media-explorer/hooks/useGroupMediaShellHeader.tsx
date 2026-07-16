import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useMemo } from "react";
import { useGroupsShellHeader } from "../../../groups/groups-shell/use-groups-shell-header";
import { resolveGroupShellHeaderTitle } from "../../group-shell-header-model";
import GroupHeaderTrackingProjector from "../../GroupHeaderTrackingProjector";
import GroupMediaHeaderActions from "../components/GroupMediaHeaderActions";

interface UseGroupMediaShellHeaderOptions {
	groupId: string;
	groupSource: string;
	initialGroupName: string | undefined;
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	selectedMediaCount: number;
	isUpdatingGroupIntegrationStatus: boolean;
	onBack: () => void;
	onGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	onRemoveSelectedMedias: () => void;
}

// The routed page owns what the shell header should expose, while the shell
// still owns rendering. Keeping this wiring in a hook prevents header state
// changes from spreading orchestration JSX back into the page component.
export function useGroupMediaShellHeader({
																					 groupId,
																					 groupSource,
																					 initialGroupName,
																					 group,
																					 groupRef,
																					 selectedMediaCount,
																					 isUpdatingGroupIntegrationStatus,
																					 onBack,
																					 onGroupIntegrationStatusChange,
																					 onRemoveSelectedMedias,
																				 }: UseGroupMediaShellHeaderOptions): void {
	const headerCenterContent = useMemo(
		() => (
			<GroupHeaderTrackingProjector
				groupId={ groupId }
				groupSource={ groupSource }
				groupRef={ groupRef }
				integrationStatus={ group?.integrationStatus }
				isUpdatingIntegrationStatus={ isUpdatingGroupIntegrationStatus }
				onGroupIntegrationStatusChange={ onGroupIntegrationStatusChange }
			/>
		),
		[
			group?.integrationStatus,
			groupId,
			groupRef,
			groupSource,
			isUpdatingGroupIntegrationStatus,
			onGroupIntegrationStatusChange,
		],
	);
	const headerRightContent  = useMemo(
		() => (
			<GroupMediaHeaderActions
				group={ group }
				groupRef={ groupRef }
				selectedMediaCount={ selectedMediaCount }
				onRemoveSelectedMedias={ onRemoveSelectedMedias }
			/>
		),
		[
			group,
			groupRef,
			onRemoveSelectedMedias,
			selectedMediaCount,
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
