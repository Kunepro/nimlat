import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { sql } from "../../../utils/sql-flag";

// Integration state intentionally keeps SQL touchpoints in one file so future schema
// migrations can be reviewed without mixing persistence details with cascade rules.
export type PlaybackIssueFlagsRow = {
	playbackIssueNote: string | null;
	hasDubIssue: number;
	hasSubIssue: number;
	hasEncodingIssue: number;
	hasAudioIssue: number;
	hasVideoIssue: number;
};

export type EpisodeStateRow = PlaybackIssueFlagsRow & {
	integrationStatus: IntegrationStatus | null;
};

export type MediaStateRow = PlaybackIssueFlagsRow & {
	integrationStatus: IntegrationStatus | null;
};

export type EpisodeNumberRow = {
	episodeNumber: number;
};

export type IpIdRow = {
	groupId: number;
};

export type MediaIdRow = {
	mediaId: number;
};

export type IntegrationPercentRow = {
	integrationPercent: number | null;
};

export type EpisodeIntegrationStatusRow = {
	integrationStatus: IntegrationStatus | null;
};

export type MediaIntegrationStatusRow = {
	integrationStatus: IntegrationStatus | null;
};

export type CountRow = {
	total: number;
};

export type GroupExistsRow = {
	total: number;
};

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_STATE = sql`
    SELECT integrationStatus,
           playbackIssueNote,
           hasDubIssue,
           hasSubIssue,
           hasEncodingIssue,
           hasAudioIssue,
           hasVideoIssue
    FROM userEpisodeStates
    WHERE episodeId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_EPISODE_STATE = sql`
    INSERT INTO userEpisodeStates (episodeId,
                                   integrationStatus,
                                   playbackIssueNote,
                                   hasDubIssue,
                                   hasSubIssue,
                                   hasEncodingIssue,
                                   hasAudioIssue,
                                   hasVideoIssue,
                                   updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episodeId) DO UPDATE SET integrationStatus = excluded.integrationStatus,
                                         playbackIssueNote = excluded.playbackIssueNote,
                                         hasDubIssue       = excluded.hasDubIssue,
                                         hasSubIssue       = excluded.hasSubIssue,
                                         hasEncodingIssue  = excluded.hasEncodingIssue,
                                         hasAudioIssue     = excluded.hasAudioIssue,
                                         hasVideoIssue     = excluded.hasVideoIssue,
                                         updatedAt         = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_DELETE_EPISODE_PLAYBACK_ISSUE_MOMENTS = sql`
    DELETE
    FROM userEpisodePlaybackIssueMoments
    WHERE episodeId = ?
`;

// noinspection SqlResolve
export const STMT_INSERT_EPISODE_PLAYBACK_ISSUE_MOMENT = sql`
    INSERT INTO userEpisodePlaybackIssueMoments (episodeId,
                                                 playbackIssueCategory,
                                                 timeSeconds,
                                                 note,
                                                 updatedAt)
    VALUES (?, ?, ?, ?, ?)
`;

// noinspection SqlResolve
export const STMT_COUNT_EPISODE_PLAYBACK_ISSUE_MOMENTS = sql`
    SELECT COUNT(*) AS total
    FROM userEpisodePlaybackIssueMoments
    WHERE episodeId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_EPISODE_INTEGRATION_SNAPSHOT = sql`
    INSERT INTO userEpisodeIntegrationSnapshots (episodeId,
                                                 integrationPercent,
                                                 updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(episodeId) DO UPDATE SET integrationPercent = excluded.integrationPercent,
                                         updatedAt          = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_STATE = sql`
    SELECT integrationStatus,
           playbackIssueNote,
           hasDubIssue,
           hasSubIssue,
           hasEncodingIssue,
           hasAudioIssue,
           hasVideoIssue
    FROM userMediaStates
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_MEDIA_STATE = sql`
    INSERT INTO userMediaStates (mediaId,
                                 integrationStatus,
                                 playbackIssueNote,
                                 hasDubIssue,
                                 hasSubIssue,
                                 hasEncodingIssue,
                                 hasAudioIssue,
                                 hasVideoIssue,
                                 updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mediaId) DO UPDATE SET integrationStatus = excluded.integrationStatus,
                                       playbackIssueNote = excluded.playbackIssueNote,
                                       hasDubIssue       = excluded.hasDubIssue,
                                       hasSubIssue       = excluded.hasSubIssue,
                                       hasEncodingIssue  = excluded.hasEncodingIssue,
                                       hasAudioIssue     = excluded.hasAudioIssue,
                                       hasVideoIssue     = excluded.hasVideoIssue,
                                       updatedAt         = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_UPSERT_MEDIA_INTEGRATION_SNAPSHOT = sql`
    INSERT INTO userMediaIntegrationSnapshots (mediaId,
                                               integrationPercent,
                                               updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(mediaId) DO UPDATE SET integrationPercent = excluded.integrationPercent,
                                       updatedAt          = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_DELETE_MEDIA_PLAYBACK_ISSUE_MOMENTS = sql`
    DELETE
    FROM userMediaPlaybackIssueMoments
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_INSERT_MEDIA_PLAYBACK_ISSUE_MOMENT = sql`
    INSERT INTO userMediaPlaybackIssueMoments (mediaId,
                                               playbackIssueCategory,
                                               timeSeconds,
                                               note,
                                               updatedAt)
    VALUES (?, ?, ?, ?, ?)
`;

// noinspection SqlResolve
export const STMT_COUNT_MEDIA_PLAYBACK_ISSUE_MOMENTS = sql`
    SELECT COUNT(*) AS total
    FROM userMediaPlaybackIssueMoments
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_ANIME_GROUP_STATE = sql`
    INSERT INTO userAnimeGroupStates (animeGroupId,
                                      integrationStatus,
                                      updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(animeGroupId) DO UPDATE SET integrationStatus = excluded.integrationStatus,
                                            updatedAt         = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_UPSERT_CUSTOM_GROUP_STATE = sql`
    INSERT INTO userCustomGroupStates (userGroupId,
                                       integrationStatus,
                                       updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(userGroupId) DO UPDATE SET integrationStatus = excluded.integrationStatus,
                                           updatedAt         = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_UPSERT_ANIME_GROUP_INTEGRATION_SNAPSHOT = sql`
    INSERT INTO userAnimeGroupIntegrationSnapshots (animeGroupId,
                                                    integrationPercent,
                                                    updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(animeGroupId) DO UPDATE SET integrationPercent = excluded.integrationPercent,
                                            updatedAt          = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_UPSERT_CUSTOM_GROUP_INTEGRATION_SNAPSHOT = sql`
    INSERT INTO userCustomGroupIntegrationSnapshots (userGroupId,
                                                     integrationPercent,
                                                     updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(userGroupId) DO UPDATE SET integrationPercent = excluded.integrationPercent,
                                           updatedAt          = excluded.updatedAt
`;

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA = sql`
    SELECT episodeNumber
    FROM anime_data.episodes
    WHERE mediaId = ?
    ORDER BY episodeNumber ASC
`;

// noinspection SqlResolve
export const STMT_SELECT_GROUP_IDS_BY_MEDIA_ANIME = sql`
    SELECT DISTINCT groupId
    FROM anime_data.groupMedia
    WHERE mediaId = ?
    ORDER BY groupId ASC
`;

// noinspection SqlResolve
export const STMT_SELECT_GROUP_IDS_BY_MEDIA_USER = sql`
    SELECT DISTINCT userGroupMedias.groupId AS groupId
    FROM userGroupMedias
    WHERE userGroupMedias.mediaId = ?
    ORDER BY userGroupMedias.groupId ASC
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_IDS_BY_GROUP_ANIME = sql`
    SELECT DISTINCT mediaId
    FROM anime_data.groupMedia
    WHERE groupId = ?
    ORDER BY mediaId ASC
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_IDS_BY_GROUP_USER = sql`
    SELECT DISTINCT mediaId
    FROM userGroupMedias
    WHERE userGroupMedias.groupId = ?
    ORDER BY mediaId ASC
`;

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_INTEGRATION_PERCENTS_BY_MEDIA = sql`
    SELECT userEpisodeIntegrationSnapshots.integrationPercent AS integrationPercent
    FROM anime_data.episodes episodes
             LEFT JOIN userEpisodeIntegrationSnapshots
                       ON userEpisodeIntegrationSnapshots.episodeId = episodes.episodeId
    WHERE episodes.mediaId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_INTEGRATION_STATUSES_BY_MEDIA = sql`
    SELECT userEpisodeStates.integrationStatus AS integrationStatus
    FROM anime_data.episodes episodes
             LEFT JOIN userEpisodeStates
                       ON userEpisodeStates.episodeId = episodes.episodeId
    WHERE episodes.mediaId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_ANIME = sql`
    SELECT userMediaIntegrationSnapshots.integrationPercent AS integrationPercent
    FROM anime_data.groupMedia groupMedia
             LEFT JOIN userMediaIntegrationSnapshots
                       ON userMediaIntegrationSnapshots.mediaId = groupMedia.mediaId
    WHERE groupMedia.groupId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_USER = sql`
    SELECT userMediaIntegrationSnapshots.integrationPercent AS integrationPercent
    FROM userGroupMedias
             LEFT JOIN userMediaIntegrationSnapshots
                       ON userMediaIntegrationSnapshots.mediaId = userGroupMedias.mediaId
    WHERE userGroupMedias.groupId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_ANIME = sql`
    SELECT userMediaStates.integrationStatus AS integrationStatus
    FROM anime_data.groupMedia groupMedia
             LEFT JOIN userMediaStates
                       ON userMediaStates.mediaId = groupMedia.mediaId
    WHERE groupMedia.groupId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_USER = sql`
    SELECT userMediaStates.integrationStatus AS integrationStatus
    FROM userGroupMedias
             LEFT JOIN userMediaStates
                       ON userMediaStates.mediaId = userGroupMedias.mediaId
    WHERE userGroupMedias.groupId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_GROUP_EXISTS_ANIME = sql`
    SELECT COUNT(*) AS total
    FROM anime_data.groups
    WHERE id = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_GROUP_EXISTS_USER = sql`
    SELECT COUNT(*) AS total
    FROM userGroups
    WHERE id = ?
`;
