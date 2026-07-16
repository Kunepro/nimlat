import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import type { MediaId } from "@nimlat/types/nimlat-ids";
import { refreshReleaseWatchStateForInterestMedia } from "./release-watch-state-refresh";
import { uniqueMediaIds } from "./release-watch-utils";

interface ReleaseWatchInterestMediaRow {
	mediaId: number;
	sourceMediaId: number;
	reason: "tracked" | "related";
	updatedAt: number;
}

export class ReleaseWatchInterestScopeService {
	public static rebuild(directlyAffectedMediaIds: MediaId[]): MediaId[] {
		const now                 = Date.now();
		const previousInterestIds = UserDbFacade.releaseWatch.listInterestMediaIds();
		const interestRows        = this.buildInterestRows(now);
		UserDbFacade.releaseWatch.replaceInterestMedia(interestRows);

		const nextInterestIds = uniqueMediaIds(interestRows.map((row) => row.mediaId));
		const nextInterestSet = new Set(nextInterestIds);
		const removedIds      = previousInterestIds.filter((mediaId) => !nextInterestSet.has(mediaId));

		this.clearRemovedInterestRows(removedIds);
		this.refreshCurrentInterestRows(
			nextInterestIds,
			now,
		);

		return uniqueMediaIds([
			...directlyAffectedMediaIds,
			...previousInterestIds,
			...nextInterestIds,
		]);
	}

	private static buildInterestRows(now: number): ReleaseWatchInterestMediaRow[] {
		const trackedMediaIds    = UserDbFacade.integration.getAllTrackedMediaIds();
		const trackedRows        = this.buildTrackedInterestRows(
			trackedMediaIds,
			now,
		);
		const relatedRows        = this.buildRelatedInterestRows(
			trackedMediaIds,
			now,
		);
		const ignoredMediaIds    = new Set(UserDbFacade.integration.getIgnoredMediaIds(relatedRows.map((row) => row.mediaId)));
		const visibleRelatedRows = this.filterIgnoredRelatedRows(
			relatedRows,
			ignoredMediaIds,
		);

		return this.dedupeInterestRows([
			...trackedRows,
			...visibleRelatedRows,
		]);
	}

	private static clearRemovedInterestRows(removedIds: MediaId[]): void {
		removedIds.forEach((mediaId) => {
			UserDbFacade.releaseWatch.deleteState(
				mediaId,
				"past",
			);
			UserDbFacade.releaseWatch.deleteState(
				mediaId,
				"upcoming",
			);
			UserDbFacade.releaseWatch.deleteScheduledRefreshesByMediaId(mediaId);
		});
	}

	private static refreshCurrentInterestRows(nextInterestIds: MediaId[], now: number): void {
		UserDbFacade.releaseWatch.getMediaFacts(nextInterestIds).forEach((facts) => {
			refreshReleaseWatchStateForInterestMedia(
				facts,
				now,
			);
		});
	}

	private static buildTrackedInterestRows(trackedMediaIds: MediaId[], now: number): ReleaseWatchInterestMediaRow[] {
		return trackedMediaIds.map((mediaId) => ({
			mediaId,
			sourceMediaId: mediaId,
			reason:        "tracked",
			updatedAt:     now,
		}));
	}

	private static buildRelatedInterestRows(trackedMediaIds: MediaId[], now: number): ReleaseWatchInterestMediaRow[] {
		return AnimeDbFacade.media.relations
			.allByMediaIds(trackedMediaIds)
			.map((relation) => ({
				mediaId:       relation.relatedMediaId,
				sourceMediaId: relation.mediaId,
				reason:        "related" as const,
				updatedAt:     now,
			}));
	}

	private static filterIgnoredRelatedRows(
		relatedRows: ReleaseWatchInterestMediaRow[],
		ignoredMediaIds: Set<number>,
	): ReleaseWatchInterestMediaRow[] {
		return relatedRows.filter((row) => !ignoredMediaIds.has(row.mediaId));
	}

	private static dedupeInterestRows(rows: ReleaseWatchInterestMediaRow[]): ReleaseWatchInterestMediaRow[] {
		const rowsByKey = new Map<string, ReleaseWatchInterestMediaRow>();
		rows.forEach((row) => {
			rowsByKey.set(
				`${ row.mediaId }:${ row.sourceMediaId }:${ row.reason }`,
				row,
			);
		});
		return Array.from(rowsByKey.values());
	}
}
