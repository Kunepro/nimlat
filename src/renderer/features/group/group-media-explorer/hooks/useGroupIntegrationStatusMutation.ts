import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useState,
} from "react";
import { persistGroupIntegrationStatus } from "../group-media-mutations-runner";

interface GroupIntegrationStatusMutationOptions {
	groupRef: GroupRef | null;
	loadSummary: (showLoader?: boolean) => Promise<void>;
	notifyGroupMutationError: (errorMessage: string) => void;
}

interface GroupIntegrationStatusMutationController {
	isUpdatingGroupIntegrationStatus: boolean;
	handleGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export function useGroupIntegrationStatusMutation({
																										groupRef,
																										loadSummary,
																										notifyGroupMutationError,
																									}: GroupIntegrationStatusMutationOptions): GroupIntegrationStatusMutationController {
	const [ isUpdatingGroupIntegrationStatus, setIsUpdatingGroupIntegrationStatus ] = useState(false);

	const handleGroupIntegrationStatusChange = useCallback(
		async (nextIntegrationStatus: IntegrationStatus | null) => {
			if (!groupRef) {
				return;
			}
			try {
				setIsUpdatingGroupIntegrationStatus(true);
				const result = await persistGroupIntegrationStatus(
					groupRef,
					nextIntegrationStatus,
				);
				if (!result.success) {
					throw new Error(result.error);
				}
				await loadSummary(false);
			} catch (error) {
				notifyGroupMutationError(error instanceof Error ? error.message : "Failed to update group integration status.");
			} finally {
				setIsUpdatingGroupIntegrationStatus(false);
			}
		},
		[
			groupRef,
			loadSummary,
			notifyGroupMutationError,
		],
	);

	return {
		isUpdatingGroupIntegrationStatus,
		handleGroupIntegrationStatusChange,
	};
}
