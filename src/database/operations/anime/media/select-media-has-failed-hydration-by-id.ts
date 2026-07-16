import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type MediaHydrationIssueRow = {
	hasFailedHydrationIssue: number;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT CASE
               WHEN EXISTS(SELECT 1
                           FROM anime_data.media media
                                    INNER JOIN anime_data.mediaHydrationQueueCharacters charactersQueue
                                               ON charactersQueue.mediaId = media.mediaId
                           WHERE media.mediaId = ?
                             AND charactersQueue.status = 'failed') OR
                    EXISTS(SELECT 1
                           FROM anime_data.media media
                                    INNER JOIN anime_data.mediaHydrationQueueStaff staffQueue
                                               ON staffQueue.mediaId = media.mediaId
                           WHERE media.mediaId = ?
                             AND staffQueue.status = 'failed') OR
                    EXISTS(SELECT 1
                           FROM anime_data.media media
                                    INNER JOIN anime_data.mediaHydrationQueueJikanEpisodes jikanEpisodesQueue
                                               ON jikanEpisodesQueue.mediaId = media.mediaId
                           WHERE media.mediaId = ?
                             AND jikanEpisodesQueue.status = 'failed') OR EXISTS(SELECT 1
                                                                                 FROM anime_data.media media
                                                                                          INNER JOIN anime_data.mediaHydrationQueueJikanEpisodeThumbnails thumbnailsQueue
                                                                                                     ON thumbnailsQueue.mediaId = media.mediaId
                                                                                 WHERE media.mediaId = ?
                                                                                   AND thumbnailsQueue.status = 'failed')
                   THEN 1
               ELSE 0
               END AS hasFailedHydrationIssue
`;

// Collapse terminal failures across every active secondary hydration queue into
// the single retry-affordance flag needed by media inspection.
export function selectMediaHasFailedHydrationById(mediaId: number): boolean {
	const row = getDatabase()
		.prepare(STMT)
		.get(
			mediaId,
			mediaId,
			mediaId,
			mediaId,
		) as MediaHydrationIssueRow | undefined;

	return row?.hasFailedHydrationIssue === 1;
}
