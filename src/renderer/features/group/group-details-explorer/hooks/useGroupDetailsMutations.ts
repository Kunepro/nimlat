import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../../hooks";
import {
	persistGroupIntegrationStatus,
	persistGroupWatchState,
} from "../../group-inspection-runner";
import type { GroupWatchedSummary } from "../group-details-explorer-model";

interface GroupDetailsMutationsOptions {
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	watchedSummary: GroupWatchedSummary;
	refreshGroupInspection: (showLoader?: boolean) => Promise<void>;
	restoreGroupSnapshot: (snapshot: GroupInspectionSummary | null) => void;
	setAllMediaWatchedSnapshot: (nextWatched: boolean) => void;
}

interface GroupDetailsMutationsController {
	isUpdatingWatchedState: boolean;
	isUpdatingIntegrationStatus: boolean;
	handleGroupWatchedToggle: () => void;
	handleGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export function useGroupDetailsMutations({
																					 group,
																					 groupRef,
																					 watchedSummary,
																					 refreshGroupInspection,
																					 restoreGroupSnapshot,
																					 setAllMediaWatchedSnapshot,
																				 }: GroupDetailsMutationsOptions): GroupDetailsMutationsController {
	const messageApi                                                      = useAppMessage();
	const [ isUpdatingWatchedState, setIsUpdatingWatchedState ]           = useState(false);
	const [ isUpdatingIntegrationStatus, setIsUpdatingIntegrationStatus ] = useState(false);

	const handleGroupWatchedToggle = useCallback(
		() => {
			if (!group || !groupRef || watchedSummary.mediasCount === 0) {
				return;
			}
			const nextWatched   = !watchedSummary.isComplete;
			const previousGroup = group;

			setIsUpdatingWatchedState(true);
			setAllMediaWatchedSnapshot(nextWatched);
			void (async () => {
				try {
					const result = await persistGroupWatchState(
						groupRef,
						nextWatched,
					);
					if (!result.success) {
						throw new Error(result.error);
					}
				} catch (error) {
					restoreGroupSnapshot(previousGroup);
					messageApi.error(error instanceof Error ? error.message : "Failed to update watched state.");
				} finally {
					setIsUpdatingWatchedState(false);
				}
			})();
		},
		[
			group,
			groupRef,
			messageApi,
			restoreGroupSnapshot,
			setAllMediaWatchedSnapshot,
			watchedSummary.isComplete,
			watchedSummary.mediasCount,
		],
	);

	const handleGroupIntegrationStatusChange = useCallback(
		async (nextIntegrationStatus: IntegrationStatus | null) => {
			if (!groupRef) {
				return;
			}
			try {
				setIsUpdatingIntegrationStatus(true);
				const result = await persistGroupIntegrationStatus(
					groupRef,
					nextIntegrationStatus,
				);
				if (!result.success) {
					throw new Error(result.error);
				}
				await refreshGroupInspection(false);
			} catch (error) {
				messageApi.error(error instanceof Error ? error.message : "Failed to update group integration status.");
			} finally {
				setIsUpdatingIntegrationStatus(false);
			}
		},
		[
			groupRef,
			messageApi,
			refreshGroupInspection,
		],
	);

	return {
		isUpdatingWatchedState,
		isUpdatingIntegrationStatus,
		handleGroupWatchedToggle,
		handleGroupIntegrationStatusChange,
	};
}
