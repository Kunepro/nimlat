import { normalizeJikanEpisodeVideoThumbnailUrl } from "@nimlat/functions";
import type { EpisodeDetailsSnapshotDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredEpisodeTitleSql } from "../../utils/preferred-title-sql";

type EpisodeDetailsSnapshotRow = {
	aired: string | null;
	duration: number | null;
	episodeNumber: number;
	filler: number | null;
	mediaId: number;
	name: string | null;
	score: number | null;
	synopsis: string | null;
	thumbnail: string | null;
};

const PREFERRED_EPISODE_TITLE_SQL = preferredEpisodeTitleSql(
	"episodes",
	"'Episode ' || episodes.episodeNumber",
);

// noinspection SqlResolve
const STMT = sql`
    SELECT episodes.mediaId,
           episodes.episodeNumber,
           ${ PREFERRED_EPISODE_TITLE_SQL } AS name,
           episodes.synopsis,
           episodes.duration,
           episodes.aired,
           episodes.score,
           episodes.filler,
           episodes.thumbnail
    FROM anime_data.episodes episodes
    WHERE episodes.mediaId = ?
      AND episodes.episodeNumber = ?
`;

// Compact canonical episode snapshot for reset flows and image gallery thumbnails.
export function selectEpisodeDetailsSnapshotById(mediaId: number, episodeNumber: number): EpisodeDetailsSnapshotDto | null {
	const row = getDatabase()
		.prepare(STMT)
		.get(
			mediaId,
			episodeNumber,
		) as EpisodeDetailsSnapshotRow | undefined;

	if (!row) {
		return null;
	}

	return {
		mediaId:       row.mediaId,
		episodeNumber: row.episodeNumber,
		name:          row.name ?? undefined,
		description:   undefined,
		aired:         row.aired ?? undefined,
		duration:      row.duration,
		score:         row.score,
		filler:        row.filler === 1,
		recap:         row.synopsis ?? undefined,
		thumbnail:     normalizeJikanEpisodeVideoThumbnailUrl(row.thumbnail) ?? undefined,
	};
}
