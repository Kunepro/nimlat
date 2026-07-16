import { getDatabase } from "../../../utils/get-db";
import {
	normalizeReleaseWatchLimit,
	normalizeReleaseWatchOffset,
	PREFERRED_MEDIA_TITLE_SQL,
	type ReleaseWatchStateRow,
} from "./user-release-watch-shared";

export function selectCatalogReleaseWatchRows(
	watchDomain: "past" | "upcoming",
	offset: number,
	limit: number,
): {
	rows: ReleaseWatchStateRow[];
	total: number;
} {
	// All-catalog scope is read-only: it derives release rows from Anime DB media
	// fields and overlays persisted watch state without materializing every title
	// into userReleaseWatchStates.
	const normalizedOffset    = normalizeReleaseWatchOffset(offset);
	const normalizedLimit     = normalizeReleaseWatchLimit(limit);
	const now                 = Date.now();
	const startReleaseAt      = `
      CAST(strftime(
          '%s',
          printf(
              '%04d-%02d-%02d',
              media.startDateYear,
              CASE
                  WHEN media.startDateMonth BETWEEN 1 AND 12 THEN media.startDateMonth
                  ELSE 1
              END,
              CASE
                  WHEN media.startDateDay BETWEEN 1 AND 31 THEN media.startDateDay
                  ELSE 1
              END
          ),
          'utc'
      ) AS INTEGER) * 1000
	`;
	const upcomingReleaseAt   = `
      CASE
          WHEN media.nextAiringEpisode IS NOT NULL
               AND media.nextAiringEpisode * 1000 > ?
              THEN media.nextAiringEpisode * 1000
          WHEN media.startDateYear IS NOT NULL
              THEN ${ startReleaseAt }
          ELSE NULL
      END
	`;
	const pastReleaseAt       = `
      CASE
          WHEN releaseWatch.resolvedReleaseAt IS NOT NULL THEN releaseWatch.resolvedReleaseAt
          WHEN media.startDateYear IS NOT NULL THEN ${ startReleaseAt }
          ELSE NULL
      END
	`;
	const derivedReleaseAt    = watchDomain === "upcoming" ? upcomingReleaseAt : pastReleaseAt;
	const stateExpression     = watchDomain === "upcoming"
		? `
      COALESCE(
          releaseWatch.state,
          CASE
              WHEN media.nextAiringEpisode IS NOT NULL
                   AND media.nextAiringEpisode * 1000 > ?
                  THEN 'upcoming_episode_release'
              ELSE 'upcoming_media_release'
          END
      )
		`
		: "COALESCE(releaseWatch.state, 'released_catalog')";
	const precisionExpression = watchDomain === "upcoming"
		? `
      COALESCE(
          releaseWatch.releaseDatePrecision,
          CASE
              WHEN media.nextAiringEpisode IS NOT NULL
                   AND media.nextAiringEpisode * 1000 > ?
                  THEN 'timestamp'
              WHEN media.startDateDay IS NOT NULL THEN 'date'
              WHEN media.startDateMonth IS NOT NULL THEN 'month'
              WHEN media.startDateYear IS NOT NULL THEN 'year'
              ELSE 'unknown'
          END
      )
		`
		: `
      COALESCE(
          releaseWatch.releaseDatePrecision,
          CASE
              WHEN media.startDateDay IS NOT NULL THEN 'date'
              WHEN media.startDateMonth IS NOT NULL THEN 'month'
              WHEN media.startDateYear IS NOT NULL THEN 'year'
              ELSE 'unknown'
          END
      )
		`;
	const sourceExpression    = watchDomain === "upcoming"
		? `
      COALESCE(
          releaseWatch.releaseDateSource,
          CASE
              WHEN media.nextAiringEpisode IS NOT NULL
                   AND media.nextAiringEpisode * 1000 > ?
                  THEN 'next_airing_episode'
              WHEN media.startDateYear IS NOT NULL THEN 'media_start_date'
              ELSE 'none'
          END
      )
		`
		: "COALESCE(releaseWatch.releaseDateSource, 'media_start_date')";
	const sortClause          = watchDomain === "past"
		? "ORDER BY resolvedReleaseAt DESC, updatedAt DESC, mediaId ASC"
		: "ORDER BY resolvedReleaseAt ASC, updatedAt DESC, mediaId ASC";
	const comparison          = watchDomain === "past" ? "<= ?" : "> ?";
	const queryNowParams      = watchDomain === "upcoming"
		? [
			now,
			now,
			now,
			now,
		]
		: [];
	const db                  = getDatabase();
	const catalogCte          = `
		WITH releaseCatalog AS (SELECT media.mediaId,
		                               ?                                                                         AS watchDomain,
                                   ${ stateExpression }     AS state,
                                   ${ derivedReleaseAt }    AS resolvedReleaseAt,
                                   ${ precisionExpression } AS releaseDatePrecision,
                                   ${ sourceExpression }    AS releaseDateSource,
		                               releaseWatch.payloadJson,
		                               COALESCE(releaseWatch.updatedAt, media.lastUpdatedAt, media.updatedAt,
		                                        0)                                                               AS updatedAt,
		                               COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL })          AS name,
		                               media.format,
		                               userMediaStates.integrationStatus,
		                               userMediaIntegrationSnapshots.integrationPercent
		                        FROM anime_data.media media
										 LEFT JOIN userReleaseWatchStates releaseWatch
												   ON releaseWatch.mediaId = media.mediaId
													   AND releaseWatch.watchDomain = ?
			                             LEFT JOIN userMediaOverrides
												   ON userMediaOverrides.mediaId = media.mediaId
			                             LEFT JOIN userMediaStates
												   ON userMediaStates.mediaId = media.mediaId
			                             LEFT JOIN userMediaIntegrationSnapshots
												   ON userMediaIntegrationSnapshots.mediaId = media.mediaId
		                        WHERE media.isStub = 0)
	`;
	const filteredCatalog     = `
      FROM releaseCatalog
      WHERE resolvedReleaseAt IS NOT NULL
        AND resolvedReleaseAt ${ comparison }
		AND state <> 'resolved_hidden'
	`;
	const queryParams         = [
		watchDomain,
		...queryNowParams,
		watchDomain,
		now,
	];
	const rows                = db
		.prepare(`
      ${ catalogCte }
      SELECT *
      ${ filteredCatalog }
      ${ sortClause }
      LIMIT ?
      OFFSET ?
		`)
		.all(
			...queryParams,
			normalizedLimit,
			normalizedOffset,
		) as ReleaseWatchStateRow[];
	const total               = (db
		.prepare(`
      ${ catalogCte }
      SELECT COUNT(*) AS total
      ${ filteredCatalog }
		`)
		.get(...queryParams) as { total: number }).total;

	return {
		rows,
		total,
	};
}
