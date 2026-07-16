import { getDatabase } from "../../../utils/get-db";
import type { ReleaseWatchInterestReason } from "./user-release-watch-shared";

export interface UserReleaseWatchInterestMediaRow {
	mediaId: number;
	sourceMediaId: number;
	reason: ReleaseWatchInterestReason;
	updatedAt: number;
}

export function selectUserReleaseWatchInterestMediaIds(): number[] {
	return getDatabase()
		// noinspection SqlResolve
		.prepare<[], { mediaId: number }>(`
      SELECT DISTINCT mediaId
      FROM userReleaseWatchInterestMedia
		`)
		.all()
		.map((row) => row.mediaId);
}

// Replace the full materialized Release Watch interest scope in one transaction so
// untracked parents immediately stop keeping derived related titles alive unless
// another tracked parent still references them.
export function replaceUserReleaseWatchInterestMedia(rows: UserReleaseWatchInterestMediaRow[]): void {
	const db = getDatabase();
	db.transaction(() => {
		// noinspection SqlResolve
		db.prepare("DELETE FROM userReleaseWatchInterestMedia").run();
		// noinspection SqlResolve
		const insert = db
			.prepare<UserReleaseWatchInterestMediaRow>(`
          INSERT INTO userReleaseWatchInterestMedia (mediaId,
                                                     sourceMediaId,
                                                     reason,
                                                     updatedAt)
          VALUES (@mediaId,
                  @sourceMediaId,
                  @reason,
                  @updatedAt)
			`);
		rows.forEach((row) => insert.run(row));
	})();
}
