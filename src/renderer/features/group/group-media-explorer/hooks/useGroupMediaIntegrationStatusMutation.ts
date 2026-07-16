import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { useCallback } from "react";
import { persistGroupMediaIntegrationStatus } from "../group-media-mutations-runner";

interface GroupMediaIntegrationStatusMutationOptions {
	notifyGroupMutationError: (errorMessage: string) => void;
}

interface GroupMediaIntegrationStatusMutationController {
	handleMediaIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
}

export function useGroupMediaIntegrationStatusMutation({
																												 notifyGroupMutationError,
																											 }: GroupMediaIntegrationStatusMutationOptions): GroupMediaIntegrationStatusMutationController {
	const handleMediaIntegrationStatusChange = useCallback(
		async (mediaId: number, nextStatus: IntegrationStatus | null) => {
			const result = await persistGroupMediaIntegrationStatus(
				mediaId,
				nextStatus,
			);
			if (!result.success) {
				notifyGroupMutationError(result.error);
			}
		},
		[ notifyGroupMutationError ],
	);

	return { handleMediaIntegrationStatusChange };
}
