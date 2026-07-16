import { MediaDto } from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

type MediaMalId = Pick<MediaDto, "idMal">;

const STATEMENT = `
	SELECT COALESCE(
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

let getStmt: Statement<[ number ], MediaMalId>;

export function getMediaMalId() {
	if (!getStmt) {
		getStmt = getDatabase().prepare<[ number ], MediaMalId>(STATEMENT);
	}
	return getStmt;
}


