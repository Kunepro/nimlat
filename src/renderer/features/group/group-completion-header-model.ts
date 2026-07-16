import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";

export type GroupCompletionSource = GroupInspectionSummary;

function clampPercent(value: number): number {
	return Math.max(
		0,
		Math.min(
			100,
			Math.round(value),
		),
	);
}

export function resolveGroupCompletionPercent(group?: GroupCompletionSource | null): number | null {
	if (!group) {
		return null;
	}
	if (group.integrationPercent != null) {
		return clampPercent(group.integrationPercent);
	}
	return group.mediasCount === 0 ? 0 : null;
}
