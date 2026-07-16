import {
	MediaDto,
	MediaProviderIdsDto,
} from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

type MediaProviderIdsRow = Pick<MediaDto, "idAniList" | "idMal">;

const STATEMENT = `
	SELECT
		media.idAniList AS idAniList,
		COALESCE(
			CAST((
				SELECT providerMediaId
				FROM anime_data.mediaProviderMappings
				WHERE mediaId = media.mediaId
				  AND provider = 'mal'
				ORDER BY isPrimary DESC, lastVerifiedAt DESC
				LIMIT 1
			) AS INTEGER),
			media.idMal
		) AS idMal
	FROM anime_data.media media
	WHERE media.mediaId = ?
`;

let getStmt: Statement<[ number ], MediaProviderIdsRow>;

// Resolve provider identities at the last DB boundary before external API work.
// Callers retain mediaId for ownership/queue state and use these values only in
// provider requests; missing mappings remain explicit nulls.
export function getMediaProviderIds() {
	if (!getStmt) {
		getStmt = getDatabase().prepare<[ number ], MediaProviderIdsRow>(STATEMENT);
	}

	return {
		get(mediaId: number): MediaProviderIdsDto {
			const row = getStmt.get(mediaId);
			return {
				mediaId,
				idAniList: row?.idAniList ?? null,
				idMal:     row?.idMal ?? null,
			};
		},
	};
}


