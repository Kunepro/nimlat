import type { Database } from "better-sqlite3";

// Return medias that still exist in the user snapshot but not in the current
// upstream group. A non-empty result means safe auto-apply cannot infer intent.
export function getUserOnlyMediaIds(db: Database, userGroupId: number, animeGroupId: number): number[] {
	// noinspection SqlResolve
	return db.prepare<[ number, number ], { mediaId: number }>(`
        SELECT ugm.mediaId
        FROM userGroupMedias ugm
        WHERE ugm.groupId = ?
          AND NOT EXISTS (
              SELECT 1
              FROM anime_data.groupMedia agm
              WHERE agm.groupId = ?
                AND agm.mediaId = ugm.mediaId
          )
        ORDER BY ugm.mediaId
	`).all(
		userGroupId,
		animeGroupId,
	).map(row => row.mediaId);
}

// Return medias added upstream and absent from a clean user lineage. These are
// the only existing-lineage membership changes safe-apply may import directly.
export function getAnimeOnlyMediaIds(db: Database, animeGroupId: number, userGroupId: number): number[] {
	// noinspection SqlResolve
	return db.prepare<[ number, number ], { mediaId: number }>(`
        SELECT agm.mediaId
        FROM anime_data.groupMedia agm
        WHERE agm.groupId = ?
          AND NOT EXISTS (
              SELECT 1
              FROM userGroupMedias ugm
              WHERE ugm.groupId = ?
                AND ugm.mediaId = agm.mediaId
          )
        ORDER BY agm.mediaId
	`).all(
		animeGroupId,
		userGroupId,
	).map(row => row.mediaId);
}

// Distinguish upstream entity removal from ordinary membership drift by checking
// whether any user-only canonical media IDs disappeared from anime_data.media.
export function hasAnyMissingAnimeMedia(db: Database, mediaIds: number[]): boolean {
	if (mediaIds.length === 0) {
		return false;
	}

	// noinspection SqlResolve
	const selectMedia = db.prepare<[ number ], { existsFlag: 1 }>(`
        SELECT 1 AS existsFlag
        FROM anime_data.media
        WHERE mediaId = ?
        LIMIT 1
	`);

	return mediaIds.some(mediaId => selectMedia.get(mediaId) == null);
}
