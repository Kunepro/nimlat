import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

// Page and count reads must share these filter CTEs so pagination totals cannot
// drift from the rows returned when a filter is changed later.
export const LIBRARY_DISPLAY_CONTEXT_CTES_SQL = sql`
    currentScope AS (SELECT ? AS scope),
    currentAdultFilter AS (SELECT ? AS adultFilter),
    currentDisplayMode AS (SELECT ? AS displayMode),
    currentGenreFilters AS (SELECT value AS name
                            FROM json_each(?)
                            WHERE type = 'text'
                              AND TRIM(value) <> ''),
    currentTagFilters AS (SELECT value AS name
                          FROM json_each(?)
                          WHERE type = 'text'
                            AND TRIM(value) <> ''),
    currentMetadataFilters AS (SELECT CASE
                                          WHEN EXISTS(SELECT 1 FROM currentGenreFilters)
                                              OR EXISTS(SELECT 1 FROM currentTagFilters) THEN 1
                                          ELSE 0
                                          END AS hasMetadataFilters),
    currentGroupingMode AS (SELECT groupingMode
                            FROM userGroupingState
                            WHERE id = 1),
    currentAdultContent AS (SELECT COALESCE((SELECT settingValue = 'true'
                                             FROM config
                                             WHERE settingKey = 'isAdultContentEnabled'),
                                            0) AS isAdultEnabled)`;

export const OFFICIAL_GROUP_IS_ADULT_SQL = sql`(COALESCE(baseMedia.isAdult, 0) = 1 OR EXISTS(SELECT 1
                                                                                              FROM anime_data.groupMedia adultMembership
                                                                                                       INNER JOIN anime_data.media adultMedia
                                                                                                                  ON adultMedia.mediaId = adultMembership.mediaId
                                                                                                                      AND adultMedia.isStub = 0
                                                                                              WHERE adultMembership.groupId = groups.id
                                                                                                AND COALESCE(adultMedia.isAdult, 0) = 1))`;

export const USER_GROUP_IS_ADULT_SQL = sql`(COALESCE(baseMedia.isAdult, 0) = 1 OR EXISTS(SELECT 1
                                                                                          FROM userGroupMedias adultMembership
                                                                                                   INNER JOIN anime_data.media adultMedia
                                                                                                              ON adultMedia.mediaId = adultMembership.mediaId
                                                                                                                  AND adultMedia.isStub = 0
                                                                                          WHERE adultMembership.groupId = userGroups.id
                                                                                            AND COALESCE(adultMedia.isAdult, 0) = 1))`;

const MEDIA_IS_ADULT_SQL = sql`(COALESCE(media.isAdult, 0) = 1)`;

export const PREFERRED_OFFICIAL_GROUP_TITLE_SQL = preferredMediaTitleSql(
	"baseMedia",
	"groups.name",
);

export const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

function createAdultFilterSql(isAdultSql: string): string {
	return sql`((adultContent.isAdultEnabled = 0 AND NOT ${ isAdultSql })
    OR (adultContent.isAdultEnabled = 1
        AND (adultFilter.adultFilter = 'mixed'
            OR (adultFilter.adultFilter = 'adult' AND ${ isAdultSql })
            OR (adultFilter.adultFilter = 'nonAdult' AND NOT ${ isAdultSql }))))`;
}

function createMediaMetadataFilterSql(mediaIdSql: string): string {
	return sql`NOT EXISTS(SELECT 1
                          FROM currentGenreFilters requiredGenre
                          WHERE NOT EXISTS(SELECT 1
                                           FROM anime_data.mediaGenres mediaGenreFilter
                                                    INNER JOIN anime_data.genres genreFilter
                                                               ON genreFilter.id = mediaGenreFilter.genreId
                                           WHERE mediaGenreFilter.mediaId = ${ mediaIdSql }
                                             AND genreFilter.name = requiredGenre.name COLLATE NOCASE))
        AND NOT EXISTS(SELECT 1
                       FROM currentTagFilters requiredTag
                       WHERE NOT EXISTS(SELECT 1
                                        FROM anime_data.mediaTags mediaTagFilter
                                                 INNER JOIN anime_data.tags tagFilter
                                                            ON tagFilter.id = mediaTagFilter.tagId
                                        WHERE mediaTagFilter.mediaId = ${ mediaIdSql }
                                          AND tagFilter.name = requiredTag.name COLLATE NOCASE))`;
}

export const OFFICIAL_GROUP_ADULT_FILTER_SQL = createAdultFilterSql(OFFICIAL_GROUP_IS_ADULT_SQL);

export const USER_GROUP_ADULT_FILTER_SQL = createAdultFilterSql(USER_GROUP_IS_ADULT_SQL);

export const MEDIA_ADULT_FILTER_SQL = createAdultFilterSql(MEDIA_IS_ADULT_SQL);

export const OFFICIAL_GROUP_MATCHES_METADATA_FILTERS_SQL = sql`((SELECT hasMetadataFilters FROM currentMetadataFilters) = 0
    OR EXISTS(SELECT 1
              FROM anime_data.groupMedia metadataMembership
                       INNER JOIN anime_data.media metadataMedia
                                  ON metadataMedia.mediaId = metadataMembership.mediaId
                                      AND metadataMedia.isStub = 0
              WHERE metadataMembership.groupId = groups.id
                AND ${ createMediaMetadataFilterSql("metadataMedia.mediaId") }))`;

export const USER_GROUP_MATCHES_METADATA_FILTERS_SQL = sql`((SELECT hasMetadataFilters FROM currentMetadataFilters) = 0
    OR EXISTS(SELECT 1
              FROM userGroupMedias metadataMembership
                       INNER JOIN anime_data.media metadataMedia
                                  ON metadataMedia.mediaId = metadataMembership.mediaId
                                      AND metadataMedia.isStub = 0
              WHERE metadataMembership.groupId = userGroups.id
                AND ${ createMediaMetadataFilterSql("metadataMedia.mediaId") }))`;

export const MEDIA_MATCHES_METADATA_FILTERS_SQL = sql`((SELECT hasMetadataFilters FROM currentMetadataFilters) = 0
    OR ${ createMediaMetadataFilterSql("media.mediaId") })`;
