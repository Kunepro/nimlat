import type { Database } from "better-sqlite3";
import { runSchemaInitTransaction } from "./schema-init-transaction";

// Local image metadata schema.
// This DB is app-owned and survives independent from replaceable `anime_data`.
// It stores cache bookkeeping for provider images without mutating source rows.
export function initImageDb(db: Database) {
	runSchemaInitTransaction(
		db,
		() => {
			// noinspection SqlResolve
			db.exec(`
        -- cachedImages:
        -- Local provider-image download ledger. This is user/app-local cache state,
        -- not Anime DB source data, because distributed anime_data files must not
        -- claim that another user's machine has already cached a remote image.
        -- Ready rows point to local files; failed rows carry retry bookkeeping.
        CREATE TABLE IF NOT EXISTS image_data.cachedImages
        (
            cacheKey      TEXT PRIMARY KEY,
            ownerKind     TEXT    NOT NULL,
            ownerId       TEXT    NOT NULL,
            imageRole     TEXT    NOT NULL,
            remoteUrl     TEXT    NOT NULL,
            localPath     TEXT,
            status        TEXT    NOT NULL DEFAULT 'pending',
            errorMessage  TEXT,
            retryCount    INTEGER NOT NULL DEFAULT 0,
            createdAt     INTEGER NOT NULL,
            updatedAt     INTEGER NOT NULL,
            lastFetchedAt INTEGER,
            lastFailedAt  INTEGER
        );

        -- idxCachedImagesOwner:
        -- Display resolution prunes and compares cache candidates by logical owner/role.
        CREATE INDEX IF NOT EXISTS image_data.idxCachedImagesOwner
            ON cachedImages (ownerKind, ownerId, imageRole);
		`);

			// noinspection SqlResolve
			db.exec(`
        -- userLocalImages:
        -- Legacy single-image local override per owner/role. Kept separately from
        -- provider cache rows so user-selected files are never overwritten by
        -- background downloads. Missing files are pruned by the image cache service.
        CREATE TABLE IF NOT EXISTS image_data.userLocalImages
        (
            ownerKind TEXT    NOT NULL,
            ownerId   TEXT    NOT NULL,
            imageRole TEXT    NOT NULL,
            localPath TEXT    NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            PRIMARY KEY (ownerKind, ownerId, imageRole)
        );
		`);

			// noinspection SqlResolve
			db.exec(`
        -- userUploadedImages:
        -- User-managed image gallery entries. Stores local file references only;
        -- file copy/validation happens in main services and this table tracks
        -- ownership plus insertion order for gallery reads.
        CREATE TABLE IF NOT EXISTS image_data.userUploadedImages
        (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            ownerKind TEXT    NOT NULL,
            ownerId   TEXT    NOT NULL,
            imageRole TEXT    NOT NULL,
            localPath TEXT    NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
        );

        -- idxUserUploadedImagesOwnerRole:
        -- Gallery reads one owner/role ordered by newest uploaded candidate first.
        CREATE INDEX IF NOT EXISTS image_data.idxUserUploadedImagesOwnerRole
            ON userUploadedImages (ownerKind, ownerId, imageRole, createdAt DESC, id DESC);
		`);

			// noinspection SqlResolve
			db.exec(`
        -- activeImageSelections:
        -- One currently selected image source per owner/role. sourceKind/sourceValue
        -- can point to provider URLs or uploaded image IDs, allowing renderer reads
        -- to resolve display images without mutating anime_data source rows.
        CREATE TABLE IF NOT EXISTS image_data.activeImageSelections
        (
            ownerKind   TEXT    NOT NULL,
            ownerId     TEXT    NOT NULL,
            imageRole   TEXT    NOT NULL,
            sourceKind  TEXT    NOT NULL,
            sourceValue TEXT    NOT NULL,
            updatedAt   INTEGER NOT NULL,
            PRIMARY KEY (ownerKind, ownerId, imageRole)
        );
		`);
		},
	);
}
