import type {
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import { getDatabase } from "../../../utils/get-db";
import {
	mergeMediaWatchStateFromImport,
	normalizeProgress,
	resolveImportedWatchProgress,
	selectMediaMatch,
} from "./user-external-tracking-core";

export interface ExternalTrackingImportApplyResult {
	importedItems: number;
	matchedItems: number;
	localUpdatedItems: number;
	changedMediaIds: number[];
	changedMediaWatchStates: Array<{
		mediaId: number;
		isWatched: boolean;
	}>;
	changedEpisodeWatchStates: Array<{
		mediaId: number;
		episodeNumber: number;
		isWatched: boolean;
	}>;
}

export interface ExternalTrackingImportApplyOptions {
	publicProfileIdentifier?: string | null;
}

function getExternalTrackingImportAuthKind(provider: ExternalTrackingProvider) {
	if (provider === "anilist") return "implicit";
	if (provider === "kitsu") return "password";
	return "pkce";
}

export function applyExternalTrackingImport(
	provider: ExternalTrackingProvider,
	items: ExternalTrackingImportedMedia[],
	options: ExternalTrackingImportApplyOptions = {},
): ExternalTrackingImportApplyResult {
	const db                      = getDatabase();
	const now                     = Date.now();
	const publicProfileIdentifier = provider === "kitsu"
		? options.publicProfileIdentifier?.trim() || null
		: null;
	return db.transaction((): ExternalTrackingImportApplyResult => {
		let matchedItems      = 0;
		let localUpdatedItems = 0;
		const changedMediaIds                                                                           = new Set<number>();
		const changedMediaWatchStates                                                                   = new Map<number, boolean>();
		const changedEpisodeWatchStates: ExternalTrackingImportApplyResult["changedEpisodeWatchStates"] = [];

		items.forEach((item) => {
			const match = typeof item.mediaId === "number"
				? {
					mediaId:       item.mediaId,
					episodesCount: item.episodesCount ?? null,
				}
				: selectMediaMatch(
					db,
					provider,
					item,
				);
			if (!match) {
				return;
			}

			matchedItems += 1;
			const exactWatchedEpisodeCount = new Set((item.episodeStates ?? [])
				.filter(state => state.isWatched)
				.map(state => state.episodeNumber)).size;
			const reportedProgress         = normalizeProgress(item.watchedEpisodeCount);
			const importedTotal            = normalizeProgress(item.episodesCount);
			const catalogTotal             = normalizeProgress(match.episodesCount);
			const episodesCount            = importedTotal || catalogTotal || null;
			// Only an explicit provider completion can authorize the all-episodes path.
			// Exact sparse states are reconciled against catalog episode numbers in the DB.
			const progress  = resolveImportedWatchProgress(
				reportedProgress,
				item.isWatched,
				episodesCount,
				exactWatchedEpisodeCount,
			);
			const isWatched = item.isWatched;

			if (item.providerMediaId) {
				db.prepare(`
            INSERT INTO externalTrackingProviderMediaMappings (provider,
                                                               mediaId,
                                                               providerMediaId)
            VALUES (?, ?, ?)
            ON CONFLICT(provider, mediaId) DO UPDATE SET providerMediaId = excluded.providerMediaId
				`).run(
					provider,
					match.mediaId,
					item.providerMediaId,
				);
			}

			const watchStateResult = mergeMediaWatchStateFromImport({
				db,
				episodeStates: item.episodeStates ?? [],
				episodesCount,
				isWatched,
				mediaId:        match.mediaId,
				now,
				progress,
				watchedAt:      item.watchedAt ?? null,
			});
			if (watchStateResult.changed) {
				localUpdatedItems += 1;
				changedMediaIds.add(match.mediaId);
				changedMediaWatchStates.set(
					match.mediaId,
					watchStateResult.isWatched,
				);
				changedEpisodeWatchStates.push(...watchStateResult.changedEpisodeStates.map(state => ({
					mediaId: match.mediaId,
					...state,
				})));
			}
		});

		// One-shot imports have no connected account, but they still need a durable
		// activity row so Preferences can report that the operation completed.
		db.prepare(`
			INSERT INTO externalTrackingAccounts (
			    provider,
			    status,
			    authKind,
			    publicProfileIdentifier,
			    lastImportedAt,
			    updatedAt
			)
			VALUES (?, 'available', ?, ?, ?, ?)
			ON CONFLICT(provider) DO UPDATE SET
			    publicProfileIdentifier = COALESCE(excluded.publicProfileIdentifier, externalTrackingAccounts.publicProfileIdentifier),
			    lastImportedAt = excluded.lastImportedAt,
			    lastError = NULL,
			    updatedAt = excluded.updatedAt
		`).run(
			provider,
			getExternalTrackingImportAuthKind(provider),
			publicProfileIdentifier,
			now,
			now,
		);

		return {
			importedItems:   items.length,
			matchedItems,
			localUpdatedItems,
			changedMediaIds: Array.from(changedMediaIds),
			changedMediaWatchStates: Array.from(changedMediaWatchStates.entries()).map(([ mediaId, isWatched ]) => ({
				mediaId,
				isWatched,
			})),
			changedEpisodeWatchStates,
		};
	})();
}
