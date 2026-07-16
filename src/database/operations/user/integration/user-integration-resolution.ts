import {
	normalizeIntegrationStatus,
	TRACKED_INTEGRATION_STATUSES,
} from "@nimlat/constants/integration-status";
import { IntegrationStatus } from "@nimlat/types/anime-db";

export const MAX_INTEGRATION_PERCENT_WITH_PLAYBACK_ISSUES = 70;

function getTrackedIntegrationStatusIndex(status: (typeof TRACKED_INTEGRATION_STATUSES)[number]): number {
	return TRACKED_INTEGRATION_STATUSES.indexOf(status);
}

export function getBaseIntegrationPercent(status?: IntegrationStatus | null): number | null {
	const normalizedStatus = normalizeIntegrationStatus(status);
	if (!normalizedStatus || normalizedStatus === "ignored") {
		return null;
	}

	const statusIndex = getTrackedIntegrationStatusIndex(normalizedStatus as (typeof TRACKED_INTEGRATION_STATUSES)[number]);
	if (statusIndex < 0) {
		return null;
	}

	return Math.round(statusIndex * 100 / (TRACKED_INTEGRATION_STATUSES.length - 1));
}

export function roundAverage(values: Array<number | null>): number | null {
	const trackedValues = values.filter((value): value is number => typeof value === "number");
	if (trackedValues.length === 0) {
		return null;
	}

	return Math.round(trackedValues.reduce(
		(sum, value) => sum + value,
		0,
	) / trackedValues.length);
}

function resolveLowestTrackedIntegrationStatus(
	statuses: Array<IntegrationStatus | null>,
): (typeof TRACKED_INTEGRATION_STATUSES)[number] | null {
	const trackedStatuses = statuses.filter((status): status is (typeof TRACKED_INTEGRATION_STATUSES)[number] => {
		return status !== null && TRACKED_INTEGRATION_STATUSES.includes(status as (typeof TRACKED_INTEGRATION_STATUSES)[number]);
	});

	if (trackedStatuses.length === 0) {
		return null;
	}

	return trackedStatuses.slice(1).reduce<(typeof TRACKED_INTEGRATION_STATUSES)[number]>(
		(lowestStatus, status) => {
			return getTrackedIntegrationStatusIndex(status) < getTrackedIntegrationStatusIndex(lowestStatus)
				? status
				: lowestStatus;
		},
		trackedStatuses[ 0 ],
	);
}

export function resolveMediaIntegrationStatusFromEpisodeStatuses(
	episodeStatuses: Array<IntegrationStatus | null>,
): IntegrationStatus | null {
	const normalizedStatuses = episodeStatuses.map(status => normalizeIntegrationStatus(status));
	const trackedStatus      = resolveLowestTrackedIntegrationStatus(normalizedStatuses);

	if (trackedStatus) {
		return trackedStatus;
	}

	if (
		normalizedStatuses.length > 0
		&& normalizedStatuses.every(status => status === "ignored")
	) {
		return "ignored";
	}

	return null;
}

export function resolveGroupIntegrationStatusFromMediaStatuses(
	mediaStatuses: Array<IntegrationStatus | null>,
): IntegrationStatus | null {
	const normalizedStatuses = mediaStatuses.map(status => normalizeIntegrationStatus(status));
	// Group phase follows only active library intent: ignored and untracked media do
	// not participate, while the lowest tracked-or-above phase represents the group.
	const trackedStatus = resolveLowestTrackedIntegrationStatus(normalizedStatuses);

	if (trackedStatus) {
		return trackedStatus;
	}

	if (
		normalizedStatuses.length > 0
		&& normalizedStatuses.every(status => status === "ignored")
	) {
		return "ignored";
	}

	return null;
}
