import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";

export interface GroupWatchedSummary {
	mediasCount: number;
	watchedMediasCount: number;
	status: "watched" | "partial" | "unwatched";
	isComplete: boolean;
}

export function resolveGroupDetailsRef(
	groupSource: string | undefined,
	groupId: string | undefined,
): GroupRef | null {
	const numericGroupId = Number(groupId);
	if ((groupSource !== "official" && groupSource !== "user") || Number.isNaN(numericGroupId)) {
		return null;
	}

	return {
		source:  groupSource,
		groupId: numericGroupId,
	};
}

export function isGroupDetailsEventAffected(
	groupRef: GroupRef | null,
	affectedGroups: GroupRef[] | undefined,
): boolean {
	if (!groupRef) {
		return false;
	}
	if (!affectedGroups) {
		return true;
	}

	return affectedGroups.some(candidate =>
		candidate.source === groupRef.source
		&& candidate.groupId === groupRef.groupId);
}

export function createGroupWatchedSummary(group: GroupInspectionSummary | null): GroupWatchedSummary {
	const mediasCount                           = group?.mediasCount ?? 0;
	const watchedMediasCount                    = group?.watchedMediasCount ?? 0;
	const status: GroupWatchedSummary["status"] = mediasCount > 0 && watchedMediasCount === mediasCount
		? "watched"
		: watchedMediasCount > 0
			? "partial"
			: "unwatched";

	return {
		mediasCount,
		watchedMediasCount,
		status,
		isComplete: mediasCount > 0 && watchedMediasCount === mediasCount,
	};
}
