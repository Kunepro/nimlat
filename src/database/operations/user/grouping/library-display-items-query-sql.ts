import { sql } from "../../../utils/sql-flag";
import {
	LIBRARY_DISPLAY_CONTEXT_CTES_SQL,
	MEDIA_ADULT_FILTER_SQL,
	MEDIA_MATCHES_METADATA_FILTERS_SQL,
	OFFICIAL_GROUP_ADULT_FILTER_SQL,
	OFFICIAL_GROUP_IS_ADULT_SQL,
	OFFICIAL_GROUP_MATCHES_METADATA_FILTERS_SQL,
	PREFERRED_MEDIA_TITLE_SQL,
	PREFERRED_OFFICIAL_GROUP_TITLE_SQL,
	USER_GROUP_ADULT_FILTER_SQL,
	USER_GROUP_IS_ADULT_SQL,
	USER_GROUP_MATCHES_METADATA_FILTERS_SQL,
} from "./library-display-items-filter-sql";

// Library display is a high-traffic read model. Keep the full SQL contract together
// so page/count predicates can be audited side-by-side without mixing execution code into it.
// noinspection SqlResolve
export const LIBRARY_DISPLAY_ITEMS_PAGE_SQL = sql`
    WITH ${ LIBRARY_DISPLAY_CONTEXT_CTES_SQL },
         visibleOfficialGroups AS (SELECT 'group'                                                     AS itemKind,
                                          'official'                                                  AS itemSource,
                                          groups.id                                                   AS groupId,
                                          NULL                                                        AS mediaId,
                                          COALESCE(userGroupOverrides.name, ${ PREFERRED_OFFICIAL_GROUP_TITLE_SQL }) AS name,
                                          CASE
                                              WHEN userGroupOverrides.description IS NOT NULL
                                                  THEN userGroupOverrides.description
                                              ELSE groups.description
                                              END                                                     AS description,
                                          groups.imageUrl                                             AS imageUrl,
                                          NULL                                                        AS format,
                                          CASE
											  WHEN ${ OFFICIAL_GROUP_IS_ADULT_SQL } THEN 1
	                                          ELSE 0
											  END AS isAdult,
                                          NULL                                                        AS coverImageJson,
                                          NULL                                                        AS bannerImage,
                                          CASE
	                                          WHEN SUM(CASE
		                                                   WHEN media.mediaId IS NOT NULL
			                                                   AND COALESCE(officialGroupMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested') THEN 1
		                                                   ELSE 0
		                                                   END) > 0
		                                          AND MIN(CASE
			                                                  WHEN media.mediaId IS NULL
				                                                  OR COALESCE(officialGroupMediaStates.integrationStatus, '') IN ('ignored', 'not_interested') THEN 1
			                                                  ELSE COALESCE(officialMediaWatchStates.isWatched, 0)
			                                                  END) = 1 THEN 1
	                                          ELSE 0
											  END AS isWatched,
                                          userAnimeGroupIntegrationSnapshots.integrationPercent       AS integrationPercent,
                                          userAnimeGroupStates.integrationStatus                      AS integrationStatus,
                                          COUNT(media.mediaId)                                        AS mediasCount,
                                          COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
                                   FROM currentScope scopeFilter
											CROSS JOIN currentAdultFilter adultFilter
	                                        CROSS JOIN currentDisplayMode displayMode
                                            CROSS JOIN currentGroupingMode groupingMode
                                            CROSS JOIN currentAdultContent adultContent
                                            CROSS JOIN anime_data.groups groups
                                            LEFT JOIN userGroupOverrides
                                                      ON userGroupOverrides.animeGroupId = groups.id
                                            LEFT JOIN userHiddenOfficialGroups hiddenOfficialGroups
                                                      ON hiddenOfficialGroups.animeGroupId = groups.id
                                            LEFT JOIN anime_data.media baseMedia
                                                      ON baseMedia.mediaId = groups.baseMediaId
                                            LEFT JOIN anime_data.groupMedia groupMedia
                                                      ON groupMedia.groupId = groups.id
                                            LEFT JOIN anime_data.media media
                                                      ON media.mediaId = groupMedia.mediaId
                                                          AND media.isStub = 0
                                            LEFT JOIN userAnimeGroupIntegrationSnapshots
                                                      ON userAnimeGroupIntegrationSnapshots.animeGroupId = groups.id
                                            LEFT JOIN userAnimeGroupStates
                                                      ON userAnimeGroupStates.animeGroupId = groups.id
                                            LEFT JOIN userMediaStates officialGroupMediaStates
                                                      ON officialGroupMediaStates.mediaId = media.mediaId
                                            LEFT JOIN userMediaWatchStates officialMediaWatchStates
                                                      ON officialMediaWatchStates.mediaId = media.mediaId
                                   WHERE groupingMode.groupingMode <> 'user'
	                                 AND displayMode.displayMode = 'groups'
	                                 AND ${ OFFICIAL_GROUP_ADULT_FILTER_SQL }
	                                 AND ${ OFFICIAL_GROUP_MATCHES_METADATA_FILTERS_SQL }
                                     AND hiddenOfficialGroups.animeGroupId IS NULL
                                     AND ((scopeFilter.scope = 'ignored'
                                       AND COALESCE(userAnimeGroupStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                                       OR (scopeFilter.scope <> 'ignored'
                                           AND COALESCE(userAnimeGroupStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                                     AND (? = '' OR (COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey, '')
                                        || ' ' || COALESCE(baseMedia.nameSearchKey, '')) LIKE ?)
                                   GROUP BY groups.id,
                                            groups.name,
                                            groups.description,
                                            groups.imageUrl,
                                            userGroupOverrides.name,
                                            userGroupOverrides.description,
                                            baseMedia.name,
                                            baseMedia.nameRomanji,
                                            baseMedia.nameJapanese,
                                            baseMedia.lastUpdatedAt,
                                            userAnimeGroupIntegrationSnapshots.integrationPercent,
                                            userAnimeGroupStates.integrationStatus),
         visibleUserGroups AS (SELECT 'group'                                                     AS itemKind,
                                      'user'                                                      AS itemSource,
                                      userGroups.id                                               AS groupId,
                                      NULL                                                        AS mediaId,
                                      userGroups.name                                             AS name,
                                      userGroups.description                                      AS description,
                                      userGroups.imageUrl                                         AS imageUrl,
                                      NULL                                                        AS format,
                                      CASE
										  WHEN ${ USER_GROUP_IS_ADULT_SQL } THEN 1
	                                      ELSE 0
										  END AS isAdult,
                                      NULL                                                        AS coverImageJson,
                                      NULL                                                        AS bannerImage,
                                      CASE
	                                      WHEN SUM(CASE
		                                               WHEN media.mediaId IS NOT NULL
			                                               AND COALESCE(userGroupMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested') THEN 1
		                                               ELSE 0
		                                               END) > 0
		                                      AND MIN(CASE
			                                              WHEN media.mediaId IS NULL
				                                              OR COALESCE(userGroupMediaStates.integrationStatus, '') IN ('ignored', 'not_interested') THEN 1
			                                              ELSE COALESCE(userGroupMediaWatchStates.isWatched, 0)
			                                              END) = 1 THEN 1
	                                      ELSE 0
										  END AS isWatched,
                                      userCustomGroupIntegrationSnapshots.integrationPercent      AS integrationPercent,
                                      userCustomGroupStates.integrationStatus                     AS integrationStatus,
                                      COUNT(media.mediaId)                                        AS mediasCount,
                                      COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
                               FROM currentScope scopeFilter
										CROSS JOIN currentAdultFilter adultFilter
	                                    CROSS JOIN currentDisplayMode displayMode
                                        CROSS JOIN currentAdultContent adultContent
                                        CROSS JOIN userGroups
                                        LEFT JOIN anime_data.media baseMedia
                                                  ON baseMedia.mediaId = userGroups.baseMediaId
                                        LEFT JOIN userGroupMedias
                                                  ON userGroupMedias.groupId = userGroups.id
                                        LEFT JOIN anime_data.media media
                                                  ON media.mediaId = userGroupMedias.mediaId
                                                      AND media.isStub = 0
                                        LEFT JOIN userCustomGroupIntegrationSnapshots
                                                  ON userCustomGroupIntegrationSnapshots.userGroupId = userGroups.id
                                        LEFT JOIN userCustomGroupStates
                                                  ON userCustomGroupStates.userGroupId = userGroups.id
                                        LEFT JOIN userMediaStates userGroupMediaStates
                                                  ON userGroupMediaStates.mediaId = media.mediaId
                                        LEFT JOIN userMediaWatchStates userGroupMediaWatchStates
                                                  ON userGroupMediaWatchStates.mediaId = media.mediaId
                               WHERE displayMode.displayMode = 'groups'
	                             AND ${ USER_GROUP_ADULT_FILTER_SQL }
	                             AND ${ USER_GROUP_MATCHES_METADATA_FILTERS_SQL }
                                 AND (? = '' OR userGroups.nameSearchKey LIKE ?)
                                 AND ((scopeFilter.scope = 'ignored'
                                   AND COALESCE(userCustomGroupStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                                   OR (scopeFilter.scope <> 'ignored'
                                       AND COALESCE(userCustomGroupStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                               GROUP BY userGroups.id,
                                        userGroups.name,
                                        userGroups.description,
                                        userGroups.imageUrl,
                                        baseMedia.lastUpdatedAt,
                                        userCustomGroupIntegrationSnapshots.integrationPercent,
                                        userCustomGroupStates.integrationStatus),
         orphanMedias AS (SELECT 'media'                                          AS itemKind,
                                 NULL                                             AS itemSource,
                                 NULL                                             AS groupId,
                                 media.mediaId                                    AS mediaId,
                                 COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS name,
                                 CASE
                                     WHEN userMediaOverrides.description IS NOT NULL THEN userMediaOverrides.description
                                     ELSE media.description
                                     END                                          AS description,
                                 media.customImageUrl                             AS imageUrl,
                                 media.format                                     AS format,
                                 COALESCE(media.isAdult, 0) AS isAdult,
                                 media.coverImageJson                             AS coverImageJson,
                                 media.bannerImage                                AS bannerImage,
                                 COALESCE(userMediaWatchStates.isWatched, 0)      AS isWatched,
                                 userMediaIntegrationSnapshots.integrationPercent AS integrationPercent,
                                 userMediaStates.integrationStatus                AS integrationStatus,
                                 NULL                                             AS mediasCount,
                                 media.lastUpdatedAt                              AS lastRefreshAt
                          FROM currentScope scopeFilter
								   CROSS JOIN currentAdultFilter adultFilter
	                               CROSS JOIN currentDisplayMode displayMode
                                   CROSS JOIN currentGroupingMode groupingMode
                                   CROSS JOIN currentAdultContent adultContent
                                   CROSS JOIN anime_data.media media
                                   LEFT JOIN userMediaOverrides
                                             ON userMediaOverrides.mediaId = media.mediaId
                                   LEFT JOIN userMediaIntegrationSnapshots
                                             ON userMediaIntegrationSnapshots.mediaId = media.mediaId
                                   LEFT JOIN userMediaStates
                                             ON userMediaStates.mediaId = media.mediaId
                                   LEFT JOIN userMediaWatchStates
                                             ON userMediaWatchStates.mediaId = media.mediaId
                          WHERE media.isStub = 0
	                        AND ${ MEDIA_ADULT_FILTER_SQL }
	                        AND ${ MEDIA_MATCHES_METADATA_FILTERS_SQL }
	                        AND (displayMode.displayMode = 'rawMedia'
							  OR ((groupingMode.groupingMode = 'user'
								  OR NOT EXISTS(SELECT 1
		                                        FROM anime_data.groupMedia officialMembership
														 INNER JOIN anime_data.groups groups
																	ON groups.id = officialMembership.groupId
			                                             LEFT JOIN userHiddenOfficialGroups hiddenOfficialGroups
																   ON hiddenOfficialGroups.animeGroupId = groups.id
		                                        WHERE officialMembership.mediaId = media.mediaId
			                                      AND hiddenOfficialGroups.animeGroupId IS NULL))
								  AND NOT EXISTS(SELECT 1
		                                         FROM userGroupMedias userMembership
														  INNER JOIN userGroups
																	 ON userGroups.id = userMembership.groupId
		                                         WHERE userMembership.mediaId = media.mediaId)))
                            AND ((scopeFilter.scope = 'ignored'
                              AND COALESCE(userMediaStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                              OR (scopeFilter.scope <> 'ignored'
                                  AND COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                            AND (? = '' OR COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?))
    SELECT itemKind,
           itemSource,
           groupId,
           mediaId,
           name,
           description,
           imageUrl,
           format,
           isAdult,
           coverImageJson,
           bannerImage,
           isWatched,
           integrationPercent,
           integrationStatus,
           mediasCount,
           lastRefreshAt
    FROM (SELECT *
          FROM visibleOfficialGroups
          UNION ALL
          SELECT *
          FROM visibleUserGroups
          UNION ALL
          SELECT *
          FROM orphanMedias)
    ORDER BY CASE
                 WHEN COALESCE(integrationStatus, '') IN ('tracked', 'downloading', 'downloaded', 'integrated')
                     AND COALESCE(integrationPercent, 0) > 0
                     AND COALESCE(integrationPercent, 0) < 100 THEN 1
                 WHEN COALESCE(integrationStatus, '') IN ('tracked', 'downloading', 'downloaded', 'integrated')
                     AND COALESCE(integrationPercent, 0) >= 100 THEN 2
                 WHEN COALESCE(integrationStatus, '') IN ('tracked', 'downloading', 'downloaded', 'integrated') THEN 3
                 WHEN COALESCE(integrationStatus, '') IN ('ignored', 'not_interested') THEN 5
                 ELSE 4
                 END ASC,
             CASE
                 WHEN COALESCE(integrationStatus, '') IN ('tracked', 'downloading', 'downloaded', 'integrated')
                     THEN COALESCE(integrationPercent, 0)
                 ELSE -1
                 END DESC,
             name COLLATE NOCASE ASC,
             itemKind ASC,
             COALESCE(itemSource, '') ASC,
             COALESCE(groupId, mediaId) ASC
    LIMIT ? OFFSET ?
`;

// noinspection SqlResolve
export const LIBRARY_DISPLAY_ITEMS_COUNT_SQL = sql`
    WITH ${ LIBRARY_DISPLAY_CONTEXT_CTES_SQL },
         visibleOfficialGroups AS (SELECT groups.id
                                   FROM currentScope scopeFilter
											CROSS JOIN currentAdultFilter adultFilter
	                                        CROSS JOIN currentDisplayMode displayMode
                                            CROSS JOIN currentGroupingMode groupingMode
                                            CROSS JOIN currentAdultContent adultContent
                                            CROSS JOIN anime_data.groups groups
                                            LEFT JOIN userGroupOverrides
                                                      ON userGroupOverrides.animeGroupId = groups.id
                                            LEFT JOIN userHiddenOfficialGroups hiddenOfficialGroups
                                                      ON hiddenOfficialGroups.animeGroupId = groups.id
                                            LEFT JOIN userAnimeGroupStates
                                                      ON userAnimeGroupStates.animeGroupId = groups.id
                                            LEFT JOIN anime_data.media baseMedia
                                                      ON baseMedia.mediaId = groups.baseMediaId
                                   WHERE groupingMode.groupingMode <> 'user'
	                                 AND displayMode.displayMode = 'groups'
	                                 AND ${ OFFICIAL_GROUP_ADULT_FILTER_SQL }
	                                 AND ${ OFFICIAL_GROUP_MATCHES_METADATA_FILTERS_SQL }
                                     AND hiddenOfficialGroups.animeGroupId IS NULL
                                     AND ((scopeFilter.scope = 'ignored'
                                       AND COALESCE(userAnimeGroupStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                                       OR (scopeFilter.scope <> 'ignored'
                                           AND COALESCE(userAnimeGroupStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                                     AND (? = '' OR (COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey, '')
                                        || ' ' || COALESCE(baseMedia.nameSearchKey, '')) LIKE ?)),
         visibleUserGroups AS (SELECT userGroups.id
                               FROM currentScope scopeFilter
										CROSS JOIN currentAdultFilter adultFilter
	                                    CROSS JOIN currentDisplayMode displayMode
                                        CROSS JOIN currentAdultContent adultContent
                                        CROSS JOIN userGroups
                                        LEFT JOIN anime_data.media baseMedia
                                                  ON baseMedia.mediaId = userGroups.baseMediaId
                                        LEFT JOIN userCustomGroupStates
                                                  ON userCustomGroupStates.userGroupId = userGroups.id
                               WHERE displayMode.displayMode = 'groups'
	                             AND ${ USER_GROUP_ADULT_FILTER_SQL }
	                             AND ${ USER_GROUP_MATCHES_METADATA_FILTERS_SQL }
                                 AND ((scopeFilter.scope = 'ignored'
                                   AND COALESCE(userCustomGroupStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                                   OR (scopeFilter.scope <> 'ignored'
                                       AND COALESCE(userCustomGroupStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                                 AND (? = '' OR userGroups.nameSearchKey LIKE ?)),
         orphanMedias AS (SELECT media.mediaId
                          FROM currentScope scopeFilter
								   CROSS JOIN currentAdultFilter adultFilter
	                               CROSS JOIN currentDisplayMode displayMode
                                   CROSS JOIN currentGroupingMode groupingMode
                                   CROSS JOIN currentAdultContent adultContent
                                   CROSS JOIN anime_data.media media
                                   LEFT JOIN userMediaOverrides
                                             ON userMediaOverrides.mediaId = media.mediaId
                                   LEFT JOIN userMediaStates
                                             ON userMediaStates.mediaId = media.mediaId
                          WHERE media.isStub = 0
	                        AND ${ MEDIA_ADULT_FILTER_SQL }
	                        AND ${ MEDIA_MATCHES_METADATA_FILTERS_SQL }
	                        AND (displayMode.displayMode = 'rawMedia'
							  OR ((groupingMode.groupingMode = 'user'
								  OR NOT EXISTS(SELECT 1
		                                        FROM anime_data.groupMedia officialMembership
														 INNER JOIN anime_data.groups groups
																	ON groups.id = officialMembership.groupId
			                                             LEFT JOIN userHiddenOfficialGroups hiddenOfficialGroups
																   ON hiddenOfficialGroups.animeGroupId = groups.id
		                                        WHERE officialMembership.mediaId = media.mediaId
			                                      AND hiddenOfficialGroups.animeGroupId IS NULL))
								  AND NOT EXISTS(SELECT 1
		                                         FROM userGroupMedias userMembership
														  INNER JOIN userGroups
																	 ON userGroups.id = userMembership.groupId
		                                         WHERE userMembership.mediaId = media.mediaId)))
                            AND ((scopeFilter.scope = 'ignored'
                              AND COALESCE(userMediaStates.integrationStatus, '') IN ('ignored', 'not_interested'))
                              OR (scopeFilter.scope <> 'ignored'
                                  AND COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')))
                            AND (? = '' OR COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?))
    SELECT ((SELECT COUNT(*) FROM visibleOfficialGroups)
        + (SELECT COUNT(*) FROM visibleUserGroups)
        + (SELECT COUNT(*) FROM orphanMedias)) AS total
`;
