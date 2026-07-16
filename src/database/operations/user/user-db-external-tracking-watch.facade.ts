import {
	acknowledgeExternalTrackingPendingExports,
	applyManualEpisodeWatchState,
	applyManualMediaWatchState,
	type MediaWatchStateApplyResult,
	selectExternalTrackingPendingExportItems,
} from "./external-tracking/user-external-tracking";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Watch-state facade for local reads and manual changes. Mutations return impact
// so services can publish precise BUS invalidation events afterward.
export const UserDbExternalTrackingWatchFacade = {
	listPendingExportItems: (
														...params: Parameters<typeof selectExternalTrackingPendingExportItems>
													): ReturnType<typeof selectExternalTrackingPendingExportItems> => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.listPendingExportItems",
			() => selectExternalTrackingPendingExportItems(...params),
			{
				provider: params[ 0 ],
				limit:    params[ 1 ],
			},
		);
	},

	acknowledgePendingExports: (
															 ...params: Parameters<typeof acknowledgeExternalTrackingPendingExports>
														 ): ReturnType<typeof acknowledgeExternalTrackingPendingExports> => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.acknowledgePendingExports",
			() => acknowledgeExternalTrackingPendingExports(...params),
			{
				provider:   params[ 0 ],
				itemsCount: params[ 1 ].length,
			},
		);
	},

	setManualMediaWatchState: (mediaIds: number[], isWatched: boolean): MediaWatchStateApplyResult => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.setManualMediaWatchState",
			() => applyManualMediaWatchState(
				mediaIds,
				isWatched,
			),
			{
				mediaIds,
				isWatched,
			},
		);
	},

	setManualEpisodeWatchState: (mediaId: number, episodeNumber: number, isWatched: boolean): MediaWatchStateApplyResult => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.setManualEpisodeWatchState",
			() => applyManualEpisodeWatchState(
				mediaId,
				episodeNumber,
				isWatched,
			),
			{
				mediaId,
				episodeNumber,
				isWatched,
			},
		);
	},
} as const;
