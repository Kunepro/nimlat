import type { GroupMediaWallRange } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import {
	createGroupMediaCardRangeQueryInput,
	createGroupMediaWallRange,
	type GroupMediaCardRangeRow,
} from "../../group-media-card-range-model";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

// noinspection SqlResolve
const STMT_PAGE = sql`
    SELECT media.mediaId                                                     AS mediaId,
           COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL })  AS mediaName,
           media.format                                                      AS format,
           CASE
               WHEN userMediaOverrides.description IS NOT NULL THEN userMediaOverrides.description
               ELSE media.description
               END                                                           AS mediaDescription,
           media.customImageUrl                                              AS customImageUrl,
           media.coverImageJson                                              AS coverImageJson,
           media.bannerImage                                                 AS bannerImage,
           userMediaIntegrationSnapshots.integrationPercent                  AS mediaIntegrationPercent,
           userMediaStates.integrationStatus                                 AS mediaIntegrationStatus,
           COALESCE(userMediaWatchStates.isWatched, 0)                       AS isWatched,
           COALESCE(media.isAdult, 0) AS isAdult,
           CASE
               WHEN (
                        userMediaStates.playbackIssueNote IS NOT NULL
                            AND TRIM(userMediaStates.playbackIssueNote) <> ''
                        ) OR userMediaStates.hasDubIssue = 1
                   OR userMediaStates.hasSubIssue = 1
                   OR userMediaStates.hasEncodingIssue = 1
                   OR userMediaStates.hasAudioIssue = 1
                   OR userMediaStates.hasVideoIssue = 1
                   THEN 1
               ELSE 0
               END                                                           AS hasPlaybackIssue,
           media.lastUpdatedAt                                               AS lastRefreshAt,
           CASE
               WHEN EXISTS(SELECT 1
                           FROM anime_data.mediaHydrationQueueCharacters charactersQueue
                           WHERE charactersQueue.mediaId = media.mediaId
                             AND charactersQueue.status = 'failed') OR
                    EXISTS(SELECT 1
                           FROM anime_data.mediaHydrationQueueStaff staffQueue
                           WHERE staffQueue.mediaId = media.mediaId
                             AND staffQueue.status = 'failed') OR
                    EXISTS(SELECT 1
                           FROM anime_data.mediaHydrationQueueJikanEpisodes jikanEpisodesQueue
                           WHERE jikanEpisodesQueue.mediaId = media.mediaId
                             AND jikanEpisodesQueue.status = 'failed') OR EXISTS(SELECT 1
                                                                                 FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails thumbnailsQueue
                                                                                 WHERE thumbnailsQueue.mediaId = media.mediaId
                                                                                   AND thumbnailsQueue.status = 'failed')
                   THEN 1
               ELSE 0
               END                                                           AS hasHydrationIssue
    FROM anime_data.groupMedia groupMedia
             INNER JOIN anime_data.media media
                        ON media.mediaId = groupMedia.mediaId
                            AND media.isStub = 0
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
             LEFT JOIN userMediaStates
                       ON userMediaStates.mediaId = media.mediaId
             LEFT JOIN userMediaIntegrationSnapshots
                       ON userMediaIntegrationSnapshots.mediaId = media.mediaId
             LEFT JOIN userMediaWatchStates
                       ON userMediaWatchStates.mediaId = media.mediaId
    WHERE groupMedia.groupId = ?
      AND COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')
      AND (? = '' OR COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?)
    ORDER BY LOWER(COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL })) ASC,
             media.mediaId ASC
    LIMIT ? OFFSET ?
`;

// noinspection SqlResolve
const STMT_COUNT = sql`
    SELECT COUNT(*) AS total
    FROM anime_data.groupMedia groupMedia
             INNER JOIN anime_data.media media
                        ON media.mediaId = groupMedia.mediaId
                            AND media.isStub = 0
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
             LEFT JOIN userMediaStates
                       ON userMediaStates.mediaId = media.mediaId
    WHERE groupMedia.groupId = ?
      AND COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')
      AND (? = '' OR COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?)
`;

export function selectGroupMediaCardsRangeById(groupId: number, offset: number, limit: number, search: string): GroupMediaWallRange {
	const {
					likePattern,
					normalizedSearch,
				}     = createGroupMediaCardRangeQueryInput(search);
	const db    = getDatabase();
	const total = (db.prepare(STMT_COUNT).get(
		groupId,
		normalizedSearch,
		likePattern,
	) as { total: number }).total;
	const rows  = db.prepare(STMT_PAGE).all(
		groupId,
		normalizedSearch,
		likePattern,
		limit,
		offset,
	) as GroupMediaCardRangeRow[];

	return createGroupMediaWallRange({
		rows,
		offset,
		total,
	});
}
