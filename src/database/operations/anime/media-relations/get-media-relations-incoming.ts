import { SUPPORTED_ANIMATED_MEDIA_FORMATS } from "@nimlat/constants/supported-media-formats";
import { MediaRelationDto } from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

const SUPPORTED_FORMAT_SQL_LIST = SUPPORTED_ANIMATED_MEDIA_FORMATS.map((format) => `'${ format }'`).join(", ");

type MediaRelationsMediaId = Pick<MediaRelationDto, "mediaId">;

// When a relation placeholder becomes a fully scanned target, replay every fully
// scanned source that already pointed to it. Those edges were deliberately ignored
// while the target was generation-only state.
// noinspection SqlResolve
const STMT_INCOMING_SOURCE_MEDIAS = sql`
    SELECT DISTINCT mediaRelations.mediaId
    FROM anime_data.mediaRelations mediaRelations
             JOIN anime_data.media sourceMedia
                  ON sourceMedia.mediaId = mediaRelations.mediaId
    WHERE mediaRelations.relatedMediaId = ?
      AND sourceMedia.isStub = 0
      AND sourceMedia.format IN (${ SUPPORTED_FORMAT_SQL_LIST })
`;

// Parent-driven grouping accepts only fully scanned source rows. Generation-only
// placeholders preserve FK integrity but cannot establish Group identity.
// noinspection SqlResolve
const STMT_INCOMING_PARENT_ONLY = sql`
    SELECT mediaRelations.mediaId
    FROM anime_data.mediaRelations mediaRelations
             JOIN anime_data.media sourceMedia
                  ON sourceMedia.mediaId = mediaRelations.mediaId
    WHERE mediaRelations.relatedMediaId = ?
      AND mediaRelations.relationType = 'PARENT'
      AND sourceMedia.isStub = 0
      AND sourceMedia.format IN (${ SUPPORTED_FORMAT_SQL_LIST })
`;

let getNonParentStmt: Statement<[ number ], MediaRelationsMediaId>;
let getIncomingSourceMediasStmt: Statement<[ number ], MediaRelationsMediaId>;

function getMediaRelationsIncomingParent() {
	if (!getNonParentStmt) {
		getNonParentStmt = getDatabase().prepare<[ number ], MediaRelationsMediaId>(STMT_INCOMING_PARENT_ONLY);
	}
	return getNonParentStmt;
}

// Direct operation for callers that only need the read model rows. The prepared
// statement remains private infrastructure owned by this DB module.
export function selectIncomingParentMediaRelations(mediaId: number): MediaRelationsMediaId[] {
	return getMediaRelationsIncomingParent().all(mediaId);
}

function getMediaRelationsIncomingSourceMedias() {
	if (!getIncomingSourceMediasStmt) {
		getIncomingSourceMediasStmt = getDatabase().prepare<[ number ], MediaRelationsMediaId>(STMT_INCOMING_SOURCE_MEDIAS);
	}
	return getIncomingSourceMediasStmt;
}

// Replay coordinators need source media IDs, but they should not compose raw
// statement calls through the facade boundary.
export function selectIncomingSourceMediaRelations(mediaId: number): MediaRelationsMediaId[] {
	return getMediaRelationsIncomingSourceMedias().all(mediaId);
}
