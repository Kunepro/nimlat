import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type { ReleaseWatchMediaFactsDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import {
	PREFERRED_MEDIA_TITLE_SQL,
	type ReleaseWatchMediaFactsRow,
} from "./user-release-watch-shared";

export function selectReleaseWatchMediaFacts(mediaIds: number[]): ReleaseWatchMediaFactsDto[] {
	if (mediaIds.length === 0) {
		return [];
	}

	const uniqueMediaIds = Array.from(new Set(mediaIds));
	return getDatabase()
		// noinspection SqlResolve
		.prepare<[ string ], ReleaseWatchMediaFactsRow>(`
      SELECT media.mediaId,
             COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS name,
             media.format,
             media.status,
             media.episodesCount,
             media.nextAiringEpisodeJson,
             media.startDateYear,
             media.startDateMonth,
             media.startDateDay,
             media.lastUpdatedAt AS lastRefreshAt,
             userMediaStates.integrationStatus,
             userMediaIntegrationSnapshots.integrationPercent
      FROM anime_data.media media
               LEFT JOIN userMediaOverrides
                         ON userMediaOverrides.mediaId = media.mediaId
               LEFT JOIN userMediaStates
                         ON userMediaStates.mediaId = media.mediaId
               LEFT JOIN userMediaIntegrationSnapshots
                         ON userMediaIntegrationSnapshots.mediaId = media.mediaId
      WHERE media.mediaId IN (SELECT value FROM json_each(?))
		`)
		.all(JSON.stringify(uniqueMediaIds))
		.map((row) => ({
			...row,
			integrationStatus: normalizeIntegrationStatus(row.integrationStatus),
		}));
}
