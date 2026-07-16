import { getDatabase } from "../../../utils/get-db";
import {
	countWatchedEpisodes,
	fromBooleanFlag,
	normalizeProgress,
	resolveManualWatchedEpisodeCount,
	selectEpisodeWatchStateRow,
	selectEpisodeWatchStateRows,
	selectMediaWatchMetadata,
	selectMediaWatchState,
	toBooleanFlag,
} from "./user-external-tracking-core";
import { markExternalTrackingPendingExports } from "./user-external-tracking-pending-exports";

export interface MediaWatchStateApplyResult {
	changedMediaIds: number[];
}

export function applyManualMediaWatchState(mediaIds: number[], isWatched: boolean): MediaWatchStateApplyResult {
	const db  = getDatabase();
	const now = Date.now();

	return db.transaction(() => {
		const changedMediaIds: number[] = [];

		Array.from(new Set(mediaIds)).forEach((mediaId) => {
			const metadata = selectMediaWatchMetadata(
				db,
				mediaId,
			);
			if (!metadata) {
				return;
			}

			const current             = selectMediaWatchState(
				db,
				mediaId,
			);
			const watchedEpisodeCount = resolveManualWatchedEpisodeCount(
				metadata,
				current,
				isWatched,
			);
			const nextEpisodesCount   = metadata.episodesCount ?? (metadata.hydratedEpisodesCount > 0
				? metadata.hydratedEpisodesCount
				: current?.episodesCount ?? null);
			const currentIsWatched    = fromBooleanFlag(current?.isWatched);
			const currentEpisodeCount = normalizeProgress(current?.watchedEpisodeCount);
			const nextWatchedFlag     = toBooleanFlag(isWatched);

			if (current && currentIsWatched === isWatched && currentEpisodeCount === watchedEpisodeCount) {
				return;
			}

			// Manual toggles are local-first watched truth. They intentionally bypass
			// media-library integration because owning a file and having watched it are independent.
			db.prepare(`
				INSERT INTO userMediaWatchStates (
				    mediaId,
				    isWatched,
				    watchedEpisodeCount,
				    episodesCount,
				    watchedAt,
				    updatedAt
				)
				VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(mediaId) DO UPDATE SET
				    isWatched = excluded.isWatched,
				    watchedEpisodeCount = excluded.watchedEpisodeCount,
				    episodesCount = COALESCE(excluded.episodesCount, userMediaWatchStates.episodesCount),
				    watchedAt = excluded.watchedAt,
				    updatedAt = excluded.updatedAt
			`).run(
				mediaId,
				nextWatchedFlag,
				watchedEpisodeCount,
				nextEpisodesCount,
				isWatched ? now : null,
				now,
			);

			if (isWatched) {
				db.prepare(`
					INSERT INTO userEpisodeWatchStates (
					    episodeId,
					    mediaId,
					    episodeNumber,
					    isWatched,
					    watchedAt,
					    updatedAt
					)
					SELECT episodeId,
					       mediaId,
					       episodeNumber,
					       1,
					       ?,
					       ?
					FROM anime_data.episodes
					WHERE mediaId = ?
					ON CONFLICT(episodeId) DO UPDATE SET
					    isWatched = 1,
					    watchedAt = excluded.watchedAt,
					    updatedAt = excluded.updatedAt
				`).run(
					now,
					now,
					mediaId,
				);
			} else {
				db.prepare(`
					UPDATE userEpisodeWatchStates
					SET isWatched = 0,
					    watchedAt = NULL,
					    updatedAt = ?
					WHERE mediaId = ?
				`).run(
					now,
					mediaId,
				);
			}

			changedMediaIds.push(mediaId);
		});

		markExternalTrackingPendingExports(
			db,
			changedMediaIds,
			now,
		);

		return { changedMediaIds };
	})();
}

export function applyManualEpisodeWatchState(mediaId: number, episodeNumber: number, isWatched: boolean): MediaWatchStateApplyResult {
	const db  = getDatabase();
	const now = Date.now();

	return db.transaction(() => {
		const metadata      = selectMediaWatchMetadata(
			db,
			mediaId,
		);
		const targetEpisode = selectEpisodeWatchStateRow(
			db,
			mediaId,
			episodeNumber,
		);
		if (!metadata || !targetEpisode) {
			return { changedMediaIds: [] };
		}

		const currentEpisodeIsWatched = fromBooleanFlag(targetEpisode.isWatched);
		const current                 = selectMediaWatchState(
			db,
			mediaId,
		);
		const nextEpisodesCount       = metadata.episodesCount ?? (metadata.hydratedEpisodesCount > 0
			? metadata.hydratedEpisodesCount
			: current?.episodesCount ?? null);

		db.prepare(`
			INSERT INTO userEpisodeWatchStates (
			    episodeId,
			    mediaId,
			    episodeNumber,
			    isWatched,
			    watchedAt,
			    updatedAt
			)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(episodeId) DO UPDATE SET
			    isWatched = excluded.isWatched,
			    watchedAt = excluded.watchedAt,
			    updatedAt = excluded.updatedAt
		`).run(
			targetEpisode.episodeId,
			mediaId,
			episodeNumber,
			toBooleanFlag(isWatched),
			isWatched ? now : null,
			now,
		);

		// Aggregate display state counts explicit watched rows. Provider clients
		// must use episode identities or binary media state, never infer a prefix.
		const watchedEpisodeCount = countWatchedEpisodes(selectEpisodeWatchStateRows(
			db,
			mediaId,
		));
		const nextIsWatched         = typeof nextEpisodesCount === "number"
			&& nextEpisodesCount > 0
			&& watchedEpisodeCount >= nextEpisodesCount;
		const currentProgress       = normalizeProgress(current?.watchedEpisodeCount);
		const currentIsWatched      = fromBooleanFlag(current?.isWatched);
		const providerTargetChanged = current
			? currentProgress !== watchedEpisodeCount
			|| currentIsWatched !== nextIsWatched
			|| current.episodesCount !== nextEpisodesCount
			: watchedEpisodeCount > 0 || nextIsWatched;

		if (providerTargetChanged || !current) {
			db.prepare(`
				INSERT INTO userMediaWatchStates (
				    mediaId,
				    isWatched,
				    watchedEpisodeCount,
				    episodesCount,
				    watchedAt,
				    updatedAt
				)
				VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(mediaId) DO UPDATE SET
				    isWatched = excluded.isWatched,
				    watchedEpisodeCount = excluded.watchedEpisodeCount,
				    episodesCount = COALESCE(excluded.episodesCount, userMediaWatchStates.episodesCount),
				    watchedAt = excluded.watchedAt,
				    updatedAt = excluded.updatedAt
			`).run(
				mediaId,
				toBooleanFlag(nextIsWatched),
				watchedEpisodeCount,
				nextEpisodesCount,
				nextIsWatched ? now : null,
				now,
			);
		}

		const changedMediaIds = currentEpisodeIsWatched !== isWatched || providerTargetChanged
			? [ mediaId ]
			: [];
		if (providerTargetChanged) {
			markExternalTrackingPendingExports(
				db,
				[ mediaId ],
				now,
			);
		}
		return { changedMediaIds };
	})();
}
