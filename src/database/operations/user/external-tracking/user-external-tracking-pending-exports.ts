import type {
	ExternalTrackingEpisodeState,
	ExternalTrackingPendingExportItem,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

interface ExternalTrackingPendingExportItemRow extends Omit<ExternalTrackingPendingExportItem, "isWatched"> {
	isWatched: number;
}

interface ExternalTrackingPendingEpisodeStateRow extends Omit<ExternalTrackingEpisodeState, "isWatched"> {
	mediaId: number;
	isWatched: number;
}

// Mark only currently connected providers: a manual local change creates durable
// export work, but it never starts network activity or a background processor.
export function markExternalTrackingPendingExports(
	db: Database,
	mediaIds: number[],
	changedAt: number,
): void {
	const normalizedMediaIds = Array.from(new Set(mediaIds.filter(Number.isInteger)));
	if (normalizedMediaIds.length === 0) {
		return;
	}

	const markPending = db.prepare(`
		INSERT INTO externalTrackingPendingExports (
		    provider,
		    mediaId,
		    revision,
		    changedAt
		)
		SELECT account.provider,
		       ?,
		       1,
		       ?
		FROM externalTrackingAccounts account
		WHERE account.status = 'connected'
		ON CONFLICT(provider, mediaId) DO UPDATE SET
		    revision = externalTrackingPendingExports.revision + 1,
		    changedAt = excluded.changedAt
	`);

	normalizedMediaIds.forEach(mediaId => markPending.run(
		mediaId,
		changedAt,
	));
}

// Export selection joins the dirty identity to current local truth. In particular,
// false/zero rows must remain visible so providers can undo an earlier completion.
export function selectExternalTrackingPendingExportItems(
	provider: ExternalTrackingProvider,
	limit: number = 10_000,
): ExternalTrackingPendingExportItem[] {
	const db   = getDatabase();
	const rows = db.prepare(`
		SELECT state.mediaId,
		       state.isWatched,
		       state.watchedEpisodeCount,
		       state.episodesCount,
		       pending.revision AS pendingExportRevision,
		       media.idAniList,
		       COALESCE(
		           CAST((
		               SELECT providerMediaId
		               FROM anime_data.mediaProviderMappings
		               WHERE mediaId = media.mediaId
		                 AND provider = 'mal'
		               ORDER BY isPrimary DESC, lastVerifiedAt DESC
		               LIMIT 1
		           ) AS INTEGER),
		           media.idMal
		       ) AS idMal,
		       (
		           SELECT providerMediaId
		           FROM anime_data.mediaProviderMappings
		           WHERE mediaId = media.mediaId
		             AND provider = 'simkl'
		           ORDER BY isPrimary DESC, lastVerifiedAt DESC
		           LIMIT 1
		       ) AS idSimkl,
		       COALESCE(
		           (
		               SELECT providerMediaId
		               FROM externalTrackingProviderMediaMappings
		               WHERE mediaId = media.mediaId
		                 AND provider = 'kitsu'
		               LIMIT 1
		           ),
		           (
		               SELECT providerMediaId
		               FROM anime_data.mediaProviderMappings
		               WHERE mediaId = media.mediaId
		                 AND provider = 'kitsu'
		               ORDER BY isPrimary DESC, lastVerifiedAt DESC
		               LIMIT 1
		           )
		       ) AS idKitsu
		FROM externalTrackingPendingExports pending
		     INNER JOIN userMediaWatchStates state
		                ON state.mediaId = pending.mediaId
		     INNER JOIN anime_data.media media
		                ON media.mediaId = state.mediaId
		WHERE pending.provider = ?
		ORDER BY pending.changedAt ASC, pending.mediaId ASC
		LIMIT ?
	`).all(
		provider,
		limit,
	) as ExternalTrackingPendingExportItemRow[];

	const episodeStatesByMediaId = new Map<number, ExternalTrackingEpisodeState[]>();
	if (provider === "simkl") {
		// Reuse the same indexed dirty-set window as the media query. This keeps
		// exact episode export to two bounded queries instead of one query per title.
		const episodeRows = db.prepare(`
			WITH selectedPending AS (
				SELECT mediaId
				FROM externalTrackingPendingExports
				WHERE provider = ?
				ORDER BY changedAt ASC, mediaId ASC
				LIMIT ?
			)
			SELECT episodes.mediaId,
			       episodes.episodeNumber,
			       COALESCE(states.isWatched, 0) AS isWatched,
			       states.watchedAt
			FROM selectedPending pending
			     INNER JOIN anime_data.episodes episodes
			                ON episodes.mediaId = pending.mediaId
			     LEFT JOIN userEpisodeWatchStates states
			               ON states.episodeId = episodes.episodeId
			WHERE episodes.episodeNumber >= 1
			ORDER BY episodes.mediaId ASC, episodes.episodeNumber ASC
		`).all(
			provider,
			limit,
		) as ExternalTrackingPendingEpisodeStateRow[];
		for (const row of episodeRows) {
			const states = episodeStatesByMediaId.get(row.mediaId) ?? [];
			states.push({
				episodeNumber: row.episodeNumber,
				isWatched:     row.isWatched === 1,
				watchedAt:     row.watchedAt,
			});
			episodeStatesByMediaId.set(
				row.mediaId,
				states,
			);
		}
	}

	return rows.map(row => ({
		...row,
		isWatched: row.isWatched === 1,
		// Only Simkl can consume exact episode identities. Aggregate-only
		// providers receive binary media state and never see a fabricated prefix.
		episodeStates: provider === "simkl" ? episodeStatesByMediaId.get(row.mediaId) ?? [] : undefined,
	}));
}

// Revision-matched acknowledgement is the concurrency boundary between remote
// success and local mutation. A row changed during export deliberately survives.
export function acknowledgeExternalTrackingPendingExports(
	provider: ExternalTrackingProvider,
	items: Array<Pick<ExternalTrackingPendingExportItem, "mediaId" | "pendingExportRevision">>,
): number {
	if (items.length === 0) {
		return 0;
	}

	const db = getDatabase();
	return db.transaction(() => {
		const acknowledge = db.prepare(`
			DELETE FROM externalTrackingPendingExports
			WHERE provider = ?
			  AND mediaId = ?
			  AND revision = ?
		`);
		return items.reduce(
			(count, item) => count + acknowledge.run(
				provider,
				item.mediaId,
				item.pendingExportRevision,
			).changes,
			0,
		);
	})();
}
