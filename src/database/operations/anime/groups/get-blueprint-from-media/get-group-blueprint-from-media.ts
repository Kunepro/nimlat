import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../../utils/get-db";
import { sql } from "../../../../utils/sql-flag";
import { MediaBlueprintRaw } from "./types/media-blueprint-raw";

// Group identity may be derived only from a fully scanned canonical media row.
// Relation placeholders exist transiently while building AnimeDB and lack the
// complete metadata/lifecycle needed to become a stable Group lineage anchor.
// noinspection SqlResolve
const STATEMENT = sql`
    SELECT COALESCE(name, nameRomanji, nameJapanese, 'Media ' || mediaId) as name,
           description,
           mediaId,
           customImageUrl,
           coverImageJson
    FROM anime_data.media
    WHERE mediaId = ?
      AND isStub = 0
`;

let getStmt: Statement<[ number ], MediaBlueprintRaw>;

export function getGroupBlueprintFromMedia() {
	if (!getStmt) {
		getStmt = getDatabase().prepare<[ number ], MediaBlueprintRaw>(STATEMENT);
	}
	return getStmt;
}

