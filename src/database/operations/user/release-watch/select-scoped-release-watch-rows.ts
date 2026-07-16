import { getDatabase } from "../../../utils/get-db";
import {
	normalizeReleaseWatchLimit,
	normalizeReleaseWatchOffset,
	PREFERRED_RELEASE_WATCH_TITLE_SQL,
	type ReleaseWatchStateRow,
} from "./user-release-watch-shared";

function buildStateFilterClause(states: string[]): {
	clause: string;
	params: string[];
} {
	if (states.length === 0) {
		return {
			clause: "AND releaseWatch.state <> 'resolved_hidden'",
			params: [],
		};
	}

	return {
		clause: `AND releaseWatch.state IN (${ states.map(() => "?").join(", ") })`,
		params: states,
	};
}

function buildTrackedScopeFilterClause(): string {
	// Tracked Release Watch reads must follow the materialized interest table:
	// coordinator rebuilds that table whenever tracking intent changes, so bypassing
	// it can leak stale release rows after a media is untracked or ignored.
	return `
          AND EXISTS (
              SELECT 1
              FROM userReleaseWatchInterestMedia interest
              WHERE interest.mediaId = releaseWatch.mediaId
          )
	`;
}

export function selectScopedReleaseWatchRows(
	watchDomain: "past" | "upcoming",
	offset: number,
	limit: number,
): {
	rows: ReleaseWatchStateRow[];
	total: number;
} {
	const normalizedOffset = normalizeReleaseWatchOffset(offset);
	const normalizedLimit  = normalizeReleaseWatchLimit(limit);
	const stateFilter      = buildStateFilterClause([]);
	const scopeFilter      = buildTrackedScopeFilterClause();
	const timeFilter       = watchDomain === "upcoming"
		? "AND releaseWatch.resolvedReleaseAt IS NOT NULL AND releaseWatch.resolvedReleaseAt > ?"
		: "";
	const sortClause       = watchDomain === "past"
		? "ORDER BY releaseWatch.resolvedReleaseAt IS NULL ASC, releaseWatch.resolvedReleaseAt DESC, releaseWatch.updatedAt DESC"
		: "ORDER BY releaseWatch.resolvedReleaseAt IS NULL ASC, releaseWatch.resolvedReleaseAt ASC, releaseWatch.updatedAt DESC";
	const params           = [
		watchDomain,
		...stateFilter.params,
		...(watchDomain === "upcoming" ? [ Date.now() ] : []),
	];
	const db               = getDatabase();
	const rows             = db
		.prepare(`
      SELECT
          releaseWatch.mediaId,
          releaseWatch.watchDomain,
          releaseWatch.state,
          releaseWatch.resolvedReleaseAt,
          releaseWatch.releaseDatePrecision,
          releaseWatch.releaseDateSource,
          releaseWatch.payloadJson,
          releaseWatch.updatedAt,
          COALESCE(userMediaOverrides.name, ${ PREFERRED_RELEASE_WATCH_TITLE_SQL }) AS name,
          media.format,
          userMediaStates.integrationStatus,
          userMediaIntegrationSnapshots.integrationPercent
      FROM userReleaseWatchStates releaseWatch
               LEFT JOIN anime_data.media media
                         ON media.mediaId = releaseWatch.mediaId
               LEFT JOIN userMediaOverrides
                         ON userMediaOverrides.mediaId = releaseWatch.mediaId
               LEFT JOIN userMediaStates
                         ON userMediaStates.mediaId = releaseWatch.mediaId
               LEFT JOIN userMediaIntegrationSnapshots
                         ON userMediaIntegrationSnapshots.mediaId = releaseWatch.mediaId
      WHERE releaseWatch.watchDomain = ?
          ${ stateFilter.clause }
          ${ scopeFilter }
          ${ timeFilter }
      ${ sortClause }
      LIMIT ?
      OFFSET ?
		`)
		.all(
			...params,
			normalizedLimit,
			normalizedOffset,
		) as ReleaseWatchStateRow[];
	const total            = (db
		.prepare(`
      SELECT COUNT(*) AS total
      FROM userReleaseWatchStates releaseWatch
      WHERE releaseWatch.watchDomain = ?
          ${ stateFilter.clause }
          ${ scopeFilter }
          ${ timeFilter }
		`)
		.get(...params) as { total: number }).total;

	return {
		rows,
		total,
	};
}
