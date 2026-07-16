import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import { getDatabase } from "../../../utils/get-db";
import {
	type GroupTimelineMediaRow,
	PREFERRED_MEDIA_TITLE_SQL,
} from "./user-release-watch-shared";

function resolveTimelineDate(row: GroupTimelineMediaRow): Pick<
	GroupReleaseTimelineRow,
	| "resolvedReleaseAt"
	| "releaseDatePrecision"
	| "releaseDateSource"
> {
	if (typeof row.startDateYear === "number") {
		const month = typeof row.startDateMonth === "number" && row.startDateMonth >= 1 && row.startDateMonth <= 12
			? row.startDateMonth
			: 1;
		const day   = typeof row.startDateDay === "number" && row.startDateDay >= 1 && row.startDateDay <= 31
			? row.startDateDay
			: 1;

		return {
			resolvedReleaseAt:    Date.UTC(
				row.startDateYear,
				month - 1,
				day,
			),
			releaseDatePrecision: typeof row.startDateMonth === "number"
															? typeof row.startDateDay === "number"
					? "date"
					: "month"
															: "year",
			releaseDateSource:    "media_start_date",
		};
	}

	return {
		resolvedReleaseAt:    null,
		releaseDatePrecision: "unknown",
		releaseDateSource:    "none",
	};
}

function parseNextAiringEpisodeNumber(nextAiringEpisodeJson: string | null): number | null {
	if (!nextAiringEpisodeJson) {
		return null;
	}

	try {
		const parsed = JSON.parse(nextAiringEpisodeJson) as { episode?: unknown };
		return typeof parsed.episode === "number" && Number.isFinite(parsed.episode)
			? parsed.episode
			: null;
	} catch {
		return null;
	}
}

function toTimelineRow(row: GroupTimelineMediaRow): GroupReleaseTimelineRow {
	return {
		mediaId: row.mediaId,
		name:    row.name ?? `Media ${ row.mediaId }`,
		format:  row.format,
		status:  row.status,
		...resolveTimelineDate(row),
		nextAiringEpisodeNumber: parseNextAiringEpisodeNumber(row.nextAiringEpisodeJson),
		nextAiringEpisodeAt:     typeof row.nextAiringEpisode === "number" && Number.isFinite(row.nextAiringEpisode)
															 ? row.nextAiringEpisode * 1000
															 : null,
		integrationStatus:       normalizeIntegrationStatus(row.integrationStatus),
		integrationPercent:      row.integrationPercent,
	};
}

export function selectGroupReleaseTimeline(group: GroupRef): GroupReleaseTimelineRow[] {
	const db   = getDatabase();
	const rows = db
		.prepare(`
      SELECT
          media.mediaId,
          COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS name,
          media.format,
          media.status,
          media.nextAiringEpisode,
          media.nextAiringEpisodeJson,
          media.startDateYear,
          media.startDateMonth,
          media.startDateDay,
          userMediaStates.integrationStatus,
          userMediaIntegrationSnapshots.integrationPercent
      FROM ${ group.source === "user" ? "userGroupMedias" : "anime_data.groupMedia" } groupMedia
               INNER JOIN anime_data.media media
                          ON media.mediaId = groupMedia.mediaId
               LEFT JOIN userMediaOverrides
                         ON userMediaOverrides.mediaId = media.mediaId
               LEFT JOIN userMediaStates
                         ON userMediaStates.mediaId = media.mediaId
               LEFT JOIN userMediaIntegrationSnapshots
                         ON userMediaIntegrationSnapshots.mediaId = media.mediaId
      WHERE groupMedia.groupId = ?
        AND media.isStub = 0
		`)
		.all(group.groupId) as GroupTimelineMediaRow[];

	return rows
		.map(toTimelineRow)
		.sort((left, right) => {
			const leftSort  = left.resolvedReleaseAt ?? Number.NEGATIVE_INFINITY;
			const rightSort = right.resolvedReleaseAt ?? Number.NEGATIVE_INFINITY;
			if (leftSort !== rightSort) {
				return leftSort - rightSort;
			}
			return left.mediaId - right.mediaId;
		});
}
