import type { UserReleaseWatchStateDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";

export function saveUserReleaseWatchState(state: UserReleaseWatchStateDto): void {
	const row = {
		...state,
		resolvedReleaseAt:     state.resolvedReleaseAt ?? null,
		lastObservedReleaseAt: state.lastObservedReleaseAt ?? null,
		lastCatalogRefreshAt:  state.lastCatalogRefreshAt ?? null,
		lastIntegratedAt:      state.lastIntegratedAt ?? null,
		payloadJson:           state.payloadJson ?? null,
	};

	getDatabase()
		// noinspection SqlResolve
		.prepare<[ UserReleaseWatchStateDto ]>(`
      INSERT INTO userReleaseWatchStates (mediaId,
                                          watchDomain,
                                          state,
                                          resolvedReleaseAt,
                                          releaseDatePrecision,
                                          releaseDateSource,
                                          lastObservedReleaseAt,
                                          lastCatalogRefreshAt,
                                          lastIntegratedAt,
                                          payloadJson,
                                          updatedAt)
      VALUES (@mediaId,
              @watchDomain,
              @state,
              @resolvedReleaseAt,
              @releaseDatePrecision,
              @releaseDateSource,
              @lastObservedReleaseAt,
              @lastCatalogRefreshAt,
              @lastIntegratedAt,
              @payloadJson,
              @updatedAt)
      ON CONFLICT(mediaId, watchDomain)
          DO UPDATE SET state                 = excluded.state,
                        resolvedReleaseAt     = excluded.resolvedReleaseAt,
                        releaseDatePrecision  = excluded.releaseDatePrecision,
                        releaseDateSource     = excluded.releaseDateSource,
                        lastObservedReleaseAt = excluded.lastObservedReleaseAt,
                        lastCatalogRefreshAt  = excluded.lastCatalogRefreshAt,
                        lastIntegratedAt      = excluded.lastIntegratedAt,
                        payloadJson           = excluded.payloadJson,
                        updatedAt             = excluded.updatedAt
		`)
		.run(row);
}

export function deleteUserReleaseWatchState(
	mediaId: number,
	watchDomain: UserReleaseWatchStateDto["watchDomain"],
): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare<[ number, UserReleaseWatchStateDto["watchDomain"] ]>(`
      DELETE
      FROM userReleaseWatchStates
      WHERE mediaId = ?
        AND watchDomain = ?
		`)
		.run(
			mediaId,
			watchDomain,
		);
}
