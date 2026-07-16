import {
	MediaInspectionData,
	MediaInspectionOptions,
} from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import {
	preferredEpisodeTitleSql,
	preferredMediaTitleSql,
} from "../../utils/preferred-title-sql";
import {
	createMediaInspectionData,
	type MediaInspectionEpisodeCountRow,
	type MediaInspectionEpisodePlaybackIssueMomentRow,
	type MediaInspectionEpisodeRow,
	type MediaInspectionGenreRow,
	type MediaInspectionMediaPlaybackIssueMomentRow,
	type MediaInspectionMediaRow,
	type MediaInspectionTagRow,
} from "./media-inspection-model";

const PREFERRED_MEDIA_TITLE_SQL   = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);
const PREFERRED_EPISODE_TITLE_SQL = preferredEpisodeTitleSql(
	"episodes",
	"'Episode ' || episodes.episodeNumber",
);

// noinspection SqlResolve
const STMT_MEDIA = sql`
    SELECT media.mediaId,
           media.idAniList,
           media.idMal,
           COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL })  as name,
           COALESCE(userMediaOverrides.name, media.name)                      as nameEnglish,
           media.nameRomanji,
           media.nameJapanese,
           media.format,
           CASE
               WHEN userMediaOverrides.description IS NOT NULL THEN userMediaOverrides.description
               ELSE media.description
               END                                                           AS description,
           media.coverImageJson,
           media.bannerImage,
           media.customImageUrl as customImageUrl,
           media.status,
           media.startDateYear,
           media.startDateMonth,
           media.startDateDay,
           media.endDateYear,
           media.endDateMonth,
           media.endDateDay,
           media.season,
           media.seasonYear,
           media.countryOfOrigin,
           media.source,
           media.episodesCount,
           media.averageScore,
           media.meanScore,
           media.popularity,
           media.isAdult,
           media.nextAiringEpisodeJson,
           coverage.status                                                   AS jikanEpisodesCoverageStatus,
           jikanEpisodesQueue.status                                         AS episodeUpdatesQueueStatus,
           COALESCE(userMediaWatchStates.isWatched, 0)                       AS isWatched,
           userMediaIntegrationSnapshots.integrationPercent                  as integrationPercent,
           userMediaStates.integrationStatus                                 as integrationStatus,
           userMediaStates.playbackIssueNote                                 as playbackIssueNote,
           CASE WHEN userMediaStates.hasDubIssue = 1 THEN 1 ELSE 0 END       AS hasDubIssue,
           CASE WHEN userMediaStates.hasSubIssue = 1 THEN 1 ELSE 0 END       AS hasSubIssue,
           CASE WHEN userMediaStates.hasEncodingIssue = 1 THEN 1 ELSE 0 END  AS hasEncodingIssue,
           CASE WHEN userMediaStates.hasAudioIssue = 1 THEN 1 ELSE 0 END     AS hasAudioIssue,
           CASE WHEN userMediaStates.hasVideoIssue = 1 THEN 1 ELSE 0 END     AS hasVideoIssue,
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
    FROM anime_data.media media
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
             LEFT JOIN userMediaStates
                       ON userMediaStates.mediaId = media.mediaId
             LEFT JOIN userMediaIntegrationSnapshots
                       ON userMediaIntegrationSnapshots.mediaId = media.mediaId
             LEFT JOIN userMediaWatchStates
                       ON userMediaWatchStates.mediaId = media.mediaId
             LEFT JOIN anime_data.mediaJikanEpisodesCoverage coverage
                       ON coverage.mediaId = media.mediaId
             LEFT JOIN anime_data.mediaHydrationQueueJikanEpisodes jikanEpisodesQueue
                       ON jikanEpisodesQueue.mediaId = media.mediaId
    WHERE media.mediaId = ?
      AND media.isStub = 0
`;

// noinspection SqlResolve
const STMT_EPISODES = sql`
    SELECT episodes.mediaId,
           episodes.episodeNumber,
           COALESCE(userEpisodeOverrides.name, ${ PREFERRED_EPISODE_TITLE_SQL }) AS name,
	           CASE
	               WHEN userEpisodeOverrides.description IS NOT NULL THEN userEpisodeOverrides.description
	               END                                                      AS description,
	           episodes.synopsis                                            AS synopsis,
	           episodes.duration                                            AS duration,
	           COALESCE(userEpisodeOverrides.aired, episodes.aired)         AS aired,
	           episodes.score                                               AS score,
	           episodes.filler                                              AS filler,
	           episodes.thumbnail AS thumbnail,
           COALESCE(userEpisodeWatchStates.isWatched, 0)                AS isWatched,
           userEpisodeIntegrationSnapshots.integrationPercent           AS integrationPercent,
           userEpisodeStates.integrationStatus                          AS integrationStatus,
           userEpisodeStates.playbackIssueNote                          AS playbackIssueNote,
           CASE WHEN userEpisodeStates.hasDubIssue = 1 THEN 1 ELSE 0 END      AS hasDubIssue,
           CASE WHEN userEpisodeStates.hasSubIssue = 1 THEN 1 ELSE 0 END      AS hasSubIssue,
           CASE WHEN userEpisodeStates.hasEncodingIssue = 1 THEN 1 ELSE 0 END AS hasEncodingIssue,
           CASE WHEN userEpisodeStates.hasAudioIssue = 1 THEN 1 ELSE 0 END    AS hasAudioIssue,
           CASE WHEN userEpisodeStates.hasVideoIssue = 1 THEN 1 ELSE 0 END    AS hasVideoIssue
    FROM anime_data.episodes episodes
             LEFT JOIN userEpisodeOverrides
                       ON userEpisodeOverrides.episodeId = episodes.episodeId
             LEFT JOIN userEpisodeStates
                       ON userEpisodeStates.episodeId = episodes.episodeId
             LEFT JOIN userEpisodeWatchStates
                       ON userEpisodeWatchStates.episodeId = episodes.episodeId
             LEFT JOIN userEpisodeIntegrationSnapshots
                       ON userEpisodeIntegrationSnapshots.episodeId = episodes.episodeId
    WHERE episodes.mediaId = ?
    ORDER BY episodes.episodeNumber ASC
`;

// noinspection SqlResolve
const STMT_EPISODE_COUNT = sql`
    SELECT COUNT(episodes.episodeNumber) AS hydratedEpisodesCount
    FROM anime_data.episodes episodes
    WHERE episodes.mediaId = ?
`;

// noinspection SqlResolve
const STMT_GENRES = sql`
    SELECT genres.name
    FROM anime_data.mediaGenres mediaGenres
             INNER JOIN anime_data.genres genres
                        ON genres.id = mediaGenres.genreId
    WHERE mediaGenres.mediaId = ?
    ORDER BY genres.name COLLATE NOCASE ASC
`;

// AniList spoiler tags can reveal plot/identity details, so Details only shows
// the highest-ranked safe tags unless a future UI adds an explicit reveal state.
// noinspection SqlResolve
const STMT_TAGS = sql`
    SELECT tags.name,
           tags.category,
           tags.rank
    FROM anime_data.mediaTags mediaTags
             INNER JOIN anime_data.tags tags
                        ON tags.id = mediaTags.tagId
    WHERE mediaTags.mediaId = ?
      AND COALESCE(tags.isGeneralSpoiler, 0) = 0
      AND COALESCE(tags.isMediaSpoiler, 0) = 0
    ORDER BY COALESCE(tags.rank, 0) DESC,
             tags.name COLLATE NOCASE ASC
    LIMIT 10
`;

// noinspection SqlResolve
const STMT_EPISODE_ERROR_MOMENTS = sql`
    SELECT episodes.episodeNumber,
           moments.playbackIssueCategory,
           moments.timeSeconds,
           moments.note
    FROM userEpisodePlaybackIssueMoments moments
             INNER JOIN anime_data.episodes episodes
                        ON episodes.episodeId = moments.episodeId
    WHERE episodes.mediaId = ?
    ORDER BY episodes.episodeNumber ASC,
             moments.playbackIssueCategory ASC,
             moments.timeSeconds ASC
`;

// noinspection SqlResolve
const STMT_MEDIA_PLAYBACK_ISSUE_MOMENTS = sql`
    SELECT playbackIssueCategory,
           timeSeconds,
           note
    FROM userMediaPlaybackIssueMoments
    WHERE mediaId = ?
    ORDER BY playbackIssueCategory ASC, timeSeconds ASC
`;

export function selectMediaInspectionById(mediaId: number, options: MediaInspectionOptions = {}): MediaInspectionData | null {
	const media = getDatabase()
		.prepare(STMT_MEDIA)
		.get(mediaId) as MediaInspectionMediaRow | undefined;

	if (!media) {
		return null;
	}

	const includeEpisodes              = options.includeEpisodes !== false;
	const episodeRows                  = includeEpisodes
		? getDatabase()
			.prepare(STMT_EPISODES)
			.all(mediaId) as MediaInspectionEpisodeRow[]
		: [];
	const hydratedEpisodesCount        = includeEpisodes
		? episodeRows.length
		: ((getDatabase()
			.prepare(STMT_EPISODE_COUNT)
			.get(mediaId) as MediaInspectionEpisodeCountRow | undefined)?.hydratedEpisodesCount ?? 0);
	const playbackIssueMomentRows      = includeEpisodes
		? getDatabase()
			.prepare(STMT_EPISODE_ERROR_MOMENTS)
			.all(mediaId) as MediaInspectionEpisodePlaybackIssueMomentRow[]
		: [];
	const mediaPlaybackIssueMomentRows = getDatabase()
		.prepare(STMT_MEDIA_PLAYBACK_ISSUE_MOMENTS)
		.all(mediaId) as MediaInspectionMediaPlaybackIssueMomentRow[];
	const genreRows                    = getDatabase()
		.prepare(STMT_GENRES)
		.all(mediaId) as MediaInspectionGenreRow[];
	const tagRows                      = getDatabase()
		.prepare(STMT_TAGS)
		.all(mediaId) as MediaInspectionTagRow[];

	return createMediaInspectionData({
		episodeRows,
		genreRows,
		hydratedEpisodesCount,
		media,
		mediaPlaybackIssueMomentRows,
		playbackIssueMomentRows,
		tagRows,
	});
}
