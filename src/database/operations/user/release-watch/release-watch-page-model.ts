import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type {
	PastReleaseWatchPage,
	PastReleaseWatchRow,
	UpcomingReleaseWatchPage,
	UpcomingReleaseWatchRow,
} from "@nimlat/types/release-watch";
import {
	normalizeReleaseWatchOffset,
	parseReleaseWatchPayload,
	type ReleaseWatchStateRow,
} from "./user-release-watch-shared";

function toPastReleaseWatchRow(row: ReleaseWatchStateRow): PastReleaseWatchRow {
	return {
		mediaId:              row.mediaId,
		name:                 row.name ?? `Media ${ row.mediaId }`,
		format:               row.format,
		watchDomain:          "past",
		state:                row.state as PastReleaseWatchRow["state"],
		resolvedReleaseAt:    row.resolvedReleaseAt,
		releaseDatePrecision: row.releaseDatePrecision,
		releaseDateSource:    row.releaseDateSource,
		integrationStatus:    normalizeIntegrationStatus(row.integrationStatus),
		integrationPercent:   row.integrationPercent,
		payload:              parseReleaseWatchPayload(row.payloadJson),
		updatedAt:            row.updatedAt,
	};
}

function toUpcomingReleaseWatchRow(row: ReleaseWatchStateRow): UpcomingReleaseWatchRow {
	return {
		mediaId:              row.mediaId,
		name:                 row.name ?? `Media ${ row.mediaId }`,
		format:               row.format,
		watchDomain:          "upcoming",
		state:                row.state as UpcomingReleaseWatchRow["state"],
		resolvedReleaseAt:    row.resolvedReleaseAt,
		releaseDatePrecision: row.releaseDatePrecision,
		releaseDateSource:    row.releaseDateSource,
		integrationStatus:    normalizeIntegrationStatus(row.integrationStatus),
		integrationPercent:   row.integrationPercent,
		payload:              parseReleaseWatchPayload(row.payloadJson),
		updatedAt:            row.updatedAt,
	};
}

// Page metadata is derived after DB limit normalization so callers get stable
// pagination even when incoming offsets are negative or fractional.
export function createPastReleaseWatchPage(
	rows: ReleaseWatchStateRow[],
	total: number,
	offset: number,
): PastReleaseWatchPage {
	const normalizedOffset = normalizeReleaseWatchOffset(offset);
	const items            = rows.map(toPastReleaseWatchRow);

	return {
		items,
		total,
		nextOffset: normalizedOffset + items.length < total
									? normalizedOffset + items.length
									: null,
	};
}

export function createUpcomingReleaseWatchPage(
	rows: ReleaseWatchStateRow[],
	total: number,
	offset: number,
): UpcomingReleaseWatchPage {
	const normalizedOffset = normalizeReleaseWatchOffset(offset);
	const items            = rows.map(toUpcomingReleaseWatchRow);

	return {
		items,
		total,
		nextOffset: normalizedOffset + items.length < total
									? normalizedOffset + items.length
									: null,
	};
}
