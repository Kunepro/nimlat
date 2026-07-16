import { MediaDto } from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

type MediaName = Pick<MediaDto, "name">;

const STATEMENT = `
	SELECT COALESCE(
           media.name,
           media.nameRomanji,
           media.nameJapanese,
           'Media ' || media.mediaId
       ) AS name
  FROM anime_data.media media
  WHERE media.mediaId = ?
`;

let getStmt: Statement<[ number ], MediaName>;

export function getMediaName() {
	if (!getStmt) {
		getStmt = getDatabase().prepare<[ number ], MediaName>(STATEMENT);
	}
	return getStmt;
}



