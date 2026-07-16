import type {
	ReleaseWatchMediaFactsDto,
	UserReleaseWatchStateDto,
	UserScheduledMediaRefreshDto,
} from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type {
	GroupReleaseTimelineRow,
	PastReleaseWatchPage,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchPage,
} from "@nimlat/types/release-watch";
import {
	deleteUserReleaseWatchState,
	deleteUserScheduledMediaRefresh,
	deleteUserScheduledMediaRefreshesByMediaId,
	replaceUserReleaseWatchInterestMedia,
	saveUserReleaseWatchState,
	saveUserScheduledMediaRefresh,
	selectDueScheduledMediaRefreshes,
	selectGroupReleaseTimeline,
	selectPastReleaseWatchPage,
	selectReleaseWatchMediaFacts,
	selectUpcomingReleaseWatchPage,
	selectUserReleaseWatchInterestMediaIds,
	type UserReleaseWatchInterestMediaRow,
} from "./release-watch/user-release-watch";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Release Watch is persisted in user_data because it combines local tracking
// intent, inferred related releases, and retryable refresh scheduling.
export const UserDbReleaseWatchFacade = {
	saveState: (state: UserReleaseWatchStateDto): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.saveState",
			() => saveUserReleaseWatchState(state),
			{
				mediaId:     state.mediaId,
				watchDomain: state.watchDomain,
				state:       state.state,
			},
		);
	},

	deleteState: (mediaId: number, watchDomain: UserReleaseWatchStateDto["watchDomain"]): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.deleteState",
			() => deleteUserReleaseWatchState(
				mediaId,
				watchDomain,
			),
			{
				mediaId,
				watchDomain,
			},
		);
	},

	saveScheduledRefresh: (refresh: UserScheduledMediaRefreshDto): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.saveScheduledRefresh",
			() => saveUserScheduledMediaRefresh(refresh),
			{
				mediaId:            refresh.mediaId,
				releaseWatchReason: refresh.releaseWatchReason,
				scheduledReleaseAt: refresh.scheduledReleaseAt,
			},
		);
	},

	deleteScheduledRefreshesByMediaId: (mediaId: number): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.deleteScheduledRefreshesByMediaId",
			() => deleteUserScheduledMediaRefreshesByMediaId(mediaId),
			{ mediaId },
		);
	},

	deleteScheduledRefresh: (
														mediaId: number,
		                        releaseWatchReason: UserScheduledMediaRefreshDto["releaseWatchReason"],
		                        scheduledReleaseAt: number,
													): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.deleteScheduledRefresh",
			() => deleteUserScheduledMediaRefresh(
				mediaId,
				releaseWatchReason,
				scheduledReleaseAt,
			),
			{
				mediaId,
				releaseWatchReason,
				scheduledReleaseAt,
			},
		);
	},

	listDueScheduledRefreshes: (now: number, limit: number): UserScheduledMediaRefreshDto[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.listDueScheduledRefreshes",
			() => selectDueScheduledMediaRefreshes(
				now,
				limit,
			),
			{
				now,
				limit,
			},
		);
	},

	getMediaFacts: (mediaIds: number[]): ReleaseWatchMediaFactsDto[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.getMediaFacts",
			() => selectReleaseWatchMediaFacts(mediaIds),
			{ mediaIds },
		);
	},

	listInterestMediaIds: (): number[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.listInterestMediaIds",
			() => selectUserReleaseWatchInterestMediaIds(),
		);
	},

	replaceInterestMedia: (rows: UserReleaseWatchInterestMediaRow[]): void => {
		runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.replaceInterestMedia",
			() => replaceUserReleaseWatchInterestMedia(rows),
			{ rowCount: rows.length },
		);
	},

	listPast: (scope: ReleaseWatchScopeFilter, offset: number, limit: number): PastReleaseWatchPage => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.listPast",
			() => selectPastReleaseWatchPage(
				scope,
				offset,
				limit,
			),
			{
				scope,
				offset,
				limit,
			},
		);
	},

	listUpcoming: (scope: ReleaseWatchScopeFilter, offset: number, limit: number): UpcomingReleaseWatchPage => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.listUpcoming",
			() => selectUpcomingReleaseWatchPage(
				scope,
				offset,
				limit,
			),
			{
				scope,
				offset,
				limit,
			},
		);
	},

	getGroupTimeline: (group: GroupRef): GroupReleaseTimelineRow[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.releaseWatch.getGroupTimeline",
			() => selectGroupReleaseTimeline(group),
			{ group },
		);
	},
} as const;
