import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";

export type GroupInspectionSummaryRow = {
	groupDescription: string | null;
	groupId: number;
	groupImageUrl: string | null;
	groupIntegrationPercent: number | null;
	groupIntegrationStatus: IntegrationStatus | null;
	groupName: string;
	mediasCount: number;
	watchedMediasCount: number;
};

export function createGroupInspectionSummary(row: GroupInspectionSummaryRow | undefined): GroupInspectionSummary | null {
	if (!row) {
		return null;
	}

	return {
		description:        row.groupDescription ?? undefined,
		groupId:            row.groupId,
		imageUrl:           row.groupImageUrl ?? undefined,
		integrationPercent: row.groupIntegrationPercent ?? undefined,
		integrationStatus:  normalizeIntegrationStatus(row.groupIntegrationStatus) ?? undefined,
		mediasCount:        row.mediasCount,
		name:               row.groupName,
		watchedMediasCount: row.watchedMediasCount,
	};
}
