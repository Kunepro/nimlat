import {
	BUS_GroupListChanged,
	BUS_GroupMediaListChanged,
	BUS_MediaEpisodesItemsPatched,
	BUS_MediaWatchListChanged,
} from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import type {
	MediaWatchStateActionResult,
	SetEpisodeWatchStateRequest,
	SetEpisodeWatchStatesRequest,
	SetMediaWatchStateRequest,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { GroupReadRepository } from "../group/group-read-repository";

function normalizeMediaIds(mediaIds: number[]): number[] {
	return Array.from(new Set(mediaIds.filter(Number.isInteger)));
}

function normalizeEpisodeNumbers(episodeNumbers: number[]): number[] {
	return Array.from(new Set(episodeNumbers.filter(Number.isInteger)));
}

export class WatchStateService {
	public static setEpisodeWatchState(request: SetEpisodeWatchStateRequest): MediaWatchStateActionResult {
		if (!Number.isInteger(request.mediaId) || !Number.isInteger(request.episodeNumber)) {
			return {
				success: true,
				changedMediaIds: [],
			};
		}

		const result = UserDbFacade.externalTracking.setManualEpisodeWatchState(
			request.mediaId,
			request.episodeNumber,
			request.isWatched,
		);

		if (result.changedMediaIds.length > 0) {
			BUS_MediaEpisodesItemsPatched.next({
				mediaId: request.mediaId,
				patches: [
					{
						episodeNumber: request.episodeNumber,
						isWatched:     request.isWatched,
					},
				],
			});
			BUS_MediaWatchListChanged.next({
				mediaIds: result.changedMediaIds,
			});
			BUS_GroupMediaListChanged.next({ affectedMediaIds: result.changedMediaIds });
			BUS_GroupListChanged.next({});
		}

		return {
			success: true,
			...result,
		};
	}

	public static setEpisodeWatchStates(request: SetEpisodeWatchStatesRequest): MediaWatchStateActionResult {
		const episodeNumbers = normalizeEpisodeNumbers(request.episodeNumbers);
		const changedMediaIds = new Set<number>();

		for (const episodeNumber of episodeNumbers) {
			// Bulk UI actions intentionally reuse the single-episode path so watched-count
			// aggregation stays aligned with row toggles.
			const result = this.setEpisodeWatchState({
				mediaId: request.mediaId,
				episodeNumber,
				isWatched: request.isWatched,
			});

			if (!result.success) {
				return result;
			}

			result.changedMediaIds.forEach(mediaId => changedMediaIds.add(mediaId));
		}

		return {
			success: true,
			changedMediaIds: Array.from(changedMediaIds),
		};
	}

	public static setMediaWatchState(request: SetMediaWatchStateRequest): MediaWatchStateActionResult {
		const mediaIds = normalizeMediaIds(request.mediaIds);
		if (mediaIds.length === 0) {
			return {
				success: true,
				changedMediaIds: [],
			};
		}

		const result = UserDbFacade.externalTracking.setManualMediaWatchState(
			mediaIds,
			request.isWatched,
		);

		if (result.changedMediaIds.length > 0) {
			// Watched state affects library/group display, but it is not media-library
			// integration. Publish focused invalidation events instead of reusing tracking controls.
			BUS_MediaWatchListChanged.next({
				mediaIds: result.changedMediaIds,
			});
			BUS_GroupMediaListChanged.next({ affectedMediaIds: result.changedMediaIds });
			BUS_GroupListChanged.next({});
		}

		return {
			success: true,
			...result,
		};
	}

	public static setGroupWatchState(group: GroupRef, isWatched: boolean): MediaWatchStateActionResult {
		return this.setMediaWatchState({
			mediaIds: GroupReadRepository.getMediaIdsByRef(group),
			isWatched,
		});
	}
}
