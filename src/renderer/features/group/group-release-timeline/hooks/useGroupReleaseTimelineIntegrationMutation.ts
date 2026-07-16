import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../../hooks";
import { persistGroupIntegrationStatus } from "../../group-inspection-runner";

interface GroupReleaseTimelineIntegrationMutationOptions {
	groupRef: GroupRef | null;
	patchGroupIntegrationStatus: (nextIntegrationStatus: IntegrationStatus | null) => void;
}

interface GroupReleaseTimelineIntegrationMutationController {
	isUpdatingIntegrationStatus: boolean;
	handleGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export function useGroupReleaseTimelineIntegrationMutation({
																														 groupRef,
																														 patchGroupIntegrationStatus,
																													 }: GroupReleaseTimelineIntegrationMutationOptions): GroupReleaseTimelineIntegrationMutationController {
	const messageApi                                                      = useAppMessage();
	const [ isUpdatingIntegrationStatus, setIsUpdatingIntegrationStatus ] = useState(false);

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
				patchGroupIntegrationStatus(nextIntegrationStatus);
			} catch (error) {
				messageApi.error(error instanceof Error ? error.message : "Failed to update group integration status.");
			} finally {
				setIsUpdatingIntegrationStatus(false);
			}
		},
		[
			groupRef,
			messageApi,
			patchGroupIntegrationStatus,
		],
	);

	return {
		isUpdatingIntegrationStatus,
		handleGroupIntegrationStatusChange,
	};
}
