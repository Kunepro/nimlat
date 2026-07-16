import type { UserScheduledMediaRefreshDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import {
	normalizeReleaseWatchLimit,
	type ScheduledMediaRefreshRow,
} from "./user-release-watch-shared";

export function saveUserScheduledMediaRefresh(refresh: UserScheduledMediaRefreshDto): void {
	const row = {
		...refresh,
		lastAttemptAt:                refresh.lastAttemptAt ?? null,
		lastOutcome:                  refresh.lastOutcome ?? null,
		lastObservedCatalogStateHash: refresh.lastObservedCatalogStateHash ?? null,
		cooldownUntil:                refresh.cooldownUntil ?? null,
	};

	getDatabase()
		// noinspection SqlResolve
		.prepare<[ UserScheduledMediaRefreshDto ]>(`
      INSERT INTO userScheduledMediaRefreshes (mediaId,
                                               releaseWatchReason,
                                               scheduledReleaseAt,
                                               nextAttemptAt,
                                               attemptCount,
                                               lastAttemptAt,
                                               lastOutcome,
                                               lastObservedCatalogStateHash,
                                               cooldownUntil,
                                               updatedAt)
      VALUES (@mediaId,
              @releaseWatchReason,
              @scheduledReleaseAt,
              @nextAttemptAt,
              @attemptCount,
              @lastAttemptAt,
              @lastOutcome,
              @lastObservedCatalogStateHash,
              @cooldownUntil,
              @updatedAt)
      ON CONFLICT(mediaId, releaseWatchReason, scheduledReleaseAt)
          DO UPDATE SET nextAttemptAt                 = excluded.nextAttemptAt,
                        attemptCount                  = excluded.attemptCount,
                        lastAttemptAt                 = excluded.lastAttemptAt,
                        lastOutcome                   = excluded.lastOutcome,
                        lastObservedCatalogStateHash  = excluded.lastObservedCatalogStateHash,
                        cooldownUntil                 = excluded.cooldownUntil,
                        updatedAt                     = excluded.updatedAt
		`)
		.run(row);
}

export function deleteUserScheduledMediaRefreshesByMediaId(mediaId: number): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare<[ number ]>(`
      DELETE
      FROM userScheduledMediaRefreshes
      WHERE mediaId = ?
		`)
		.run(mediaId);
}

export function deleteUserScheduledMediaRefresh(
	mediaId: number,
	releaseWatchReason: UserScheduledMediaRefreshDto["releaseWatchReason"],
	scheduledReleaseAt: number,
): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare<[ number, UserScheduledMediaRefreshDto["releaseWatchReason"], number ]>(`
      DELETE
      FROM userScheduledMediaRefreshes
      WHERE mediaId = ?
        AND releaseWatchReason = ?
        AND scheduledReleaseAt = ?
		`)
		.run(
			mediaId,
			releaseWatchReason,
			scheduledReleaseAt,
		);
}

export function selectDueScheduledMediaRefreshes(now: number, limit: number): UserScheduledMediaRefreshDto[] {
	const normalizedLimit = normalizeReleaseWatchLimit(limit);
	return getDatabase()
		// noinspection SqlResolve
		.prepare<[ number, number, number ], ScheduledMediaRefreshRow>(`
      SELECT mediaId,
             releaseWatchReason,
             scheduledReleaseAt,
             nextAttemptAt,
             attemptCount,
             lastAttemptAt,
             lastOutcome,
             lastObservedCatalogStateHash,
             cooldownUntil,
             updatedAt
      FROM userScheduledMediaRefreshes
      WHERE nextAttemptAt <= ?
        AND (cooldownUntil IS NULL OR cooldownUntil <= ?)
      ORDER BY nextAttemptAt ASC, mediaId ASC
      LIMIT ?
		`)
		.all(
			now,
			now,
			normalizedLimit,
		);
}
