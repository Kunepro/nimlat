import type { IntegrationStatus } from "@nimlat/types/anime-db";

export const TRACKED_INTEGRATION_STATUSES = [
	"tracked",
	"downloading",
	"downloaded",
	"integrated",
] as const satisfies IntegrationStatus[];

export const NOT_TRACKED_INTEGRATION_STATUS_VALUE = "__not_tracked__" as const;

export type IntegrationStatusControlValue =
	| IntegrationStatus
	| typeof NOT_TRACKED_INTEGRATION_STATUS_VALUE;

// Existing pre-release DBs can still contain `not_interested`; normalize it to the renamed `ignored` state.
export function normalizeIntegrationStatus(status?: string | null): IntegrationStatus | null {
	if (!status) {
		return null;
	}

	if (status === "not_interested") {
		return "ignored";
	}

	return status as IntegrationStatus;
}

export function toIntegrationStatusControlValue(status?: string | null): IntegrationStatusControlValue {
	const normalizedStatus = normalizeIntegrationStatus(status);
	return normalizedStatus ?? NOT_TRACKED_INTEGRATION_STATUS_VALUE;
}

export function parseIntegrationStatusControlValue(value: string): IntegrationStatus | null {
	if (value === NOT_TRACKED_INTEGRATION_STATUS_VALUE) {
		return null;
	}

	return normalizeIntegrationStatus(value);
}

export function getIntegrationStatusLabel(status?: string | null): string {
	const normalizedStatus = normalizeIntegrationStatus(status);
	switch (normalizedStatus) {
		case "ignored":
			return "Ignored";
		case "tracked":
			return "Tracked";
		case "downloading":
			return "Downloading";
		case "downloaded":
			return "Downloaded";
		case "integrated":
			return "Integrated";
		default:
			return "Not Tracked";
	}
}

// The Library sorting/status bar only treats explicit tracked phases as progress-bearing states.
export function isTrackedIntegrationStatus(status?: string | null): status is (typeof TRACKED_INTEGRATION_STATUSES)[number] {
	const normalizedStatus = normalizeIntegrationStatus(status);
	return normalizedStatus != null && TRACKED_INTEGRATION_STATUSES.includes(normalizedStatus as (typeof TRACKED_INTEGRATION_STATUSES)[number]);
}
