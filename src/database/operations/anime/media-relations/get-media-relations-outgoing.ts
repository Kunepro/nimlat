import { SUPPORTED_ANIMATED_MEDIA_FORMATS } from "@nimlat/constants/supported-media-formats";
import { MediaRelationDto } from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

const SUPPORTED_FORMAT_SQL_LIST = SUPPORTED_ANIMATED_MEDIA_FORMATS.map((format) => `'${ format }'`).join(", ");

type MediaRelationsRelationship = Pick<MediaRelationDto, "relatedMediaId" | "relationType">;
type MediaRelationsBatchRelationship = Pick<MediaRelationDto, "mediaId" | "relatedMediaId" | "relationType">;

// Runtime relation consumers may use only fully scanned targets. Generation-only
// placeholders preserve FK edges but must not influence Groups or Release Watch.
// noinspection SqlResolve
const STMT_ALL = sql`
    SELECT mediaRelations.relatedMediaId, mediaRelations.relationType
    FROM anime_data.mediaRelations mediaRelations
             JOIN anime_data.media relatedMedia
                  ON relatedMedia.mediaId = mediaRelations.relatedMediaId
    WHERE mediaRelations.mediaId = ?
      AND relatedMedia.isStub = 0
      AND relatedMedia.format IN (${ SUPPORTED_FORMAT_SQL_LIST })
`;

// Release-watch scope rebuilds can involve many tracked medias. Keep that fan-out
// as one indexed read so the coordinator does not issue one SQLite statement per title.
// noinspection SqlResolve
const STMT_ALL_BY_MEDIA_IDS = sql`
    SELECT mediaRelations.mediaId, mediaRelations.relatedMediaId, mediaRelations.relationType
    FROM anime_data.mediaRelations mediaRelations
             JOIN anime_data.media relatedMedia
                  ON relatedMedia.mediaId = mediaRelations.relatedMediaId
    WHERE mediaRelations.mediaId IN (SELECT value FROM json_each(?))
      AND relatedMedia.isStub = 0
      AND relatedMedia.format IN (${ SUPPORTED_FORMAT_SQL_LIST })
`;

const STMT_PARENT_ONLY = `${ STMT_ALL } AND relationType = 'PARENT'`;
const STMT_NOT_PARENT  = `${ STMT_ALL } AND relationType != 'PARENT'`;

let getStmt: Statement<[ number ], MediaRelationsRelationship>;
let getBatchStmt: Statement<[ string ], MediaRelationsBatchRelationship>;
let getParentStmt: Statement<[ number ], MediaRelationsRelationship>;
let getNonParentStmt: Statement<[ number ], MediaRelationsRelationship>;

function getMediaRelationsOutgoing() {
	if (!getStmt) {
		getStmt = getDatabase().prepare<[ number ], MediaRelationsRelationship>(STMT_ALL);
	}
	return getStmt;
}

// Public operation used by facade panels; statement caching stays owned by this
// module so callers never need to know the underlying better-sqlite3 shape.
export function selectOutgoingMediaRelations(mediaId: number): MediaRelationsRelationship[] {
	return getMediaRelationsOutgoing().all(mediaId);
}

// Batch operation for release-watch scope rebuilds. De-duplication belongs here
// with the indexed JSON query, not in facade/control-panel code.
export function selectOutgoingMediaRelationsByMediaIds(mediaIds: number[]): MediaRelationsBatchRelationship[] {
	const uniqueMediaIds = Array.from(new Set(mediaIds));
	if (uniqueMediaIds.length === 0) {
		return [];
	}

	if (!getBatchStmt) {
		getBatchStmt = getDatabase().prepare<[ string ], MediaRelationsBatchRelationship>(STMT_ALL_BY_MEDIA_IDS);
	}

	return getBatchStmt.all(JSON.stringify(uniqueMediaIds));
}

function getMediaRelationsOutgoingParent() {
	if (!getParentStmt) {
		getParentStmt = getDatabase().prepare<[ number ], MediaRelationsRelationship>(STMT_PARENT_ONLY);
	}
	return getParentStmt;
}

// Parent filtering is part of the relation read model contract, so facade code
// delegates to this named operation instead of composing statement calls.
export function selectOutgoingParentMediaRelations(mediaId: number): MediaRelationsRelationship[] {
	return getMediaRelationsOutgoingParent().all(mediaId);
}

function getMediaRelationsOutgoingNonParent() {
	if (!getNonParentStmt) {
		getNonParentStmt = getDatabase().prepare<[ number ], MediaRelationsRelationship>(STMT_NOT_PARENT);
	}
	return getNonParentStmt;
}

// Non-parent filtering feeds grouping decisions and remains colocated with the
// SQL predicate that defines the supported relation subset.
export function selectOutgoingNonParentMediaRelations(mediaId: number): MediaRelationsRelationship[] {
	return getMediaRelationsOutgoingNonParent().all(mediaId);
}
