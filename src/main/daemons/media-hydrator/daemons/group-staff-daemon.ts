import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { StaffEdge } from "@nimlat/types/ani-list-media-api";
import {
	filter,
	lastValueFrom,
	map,
	tap,
} from "rxjs";
import { AniListAPI } from "../../../api/ani-list-api";
import { isAniListFetchCompletedEvent } from "../../../api/ani-list/ani-list-paged-fetch-events";
import {
	publishHydratorTaskCompleted,
	publishHydratorTaskFailed,
	publishHydratorTaskStarted,
} from "../../../services/hydrator/hydrator-progress-store";

let isProcessingStaffQueue = false;

// Process paginated staff enrichment after the canonical media row exists, so a
// failure retries without rewriting the media. V1 canonical IDs are seeded from
// AniList IDs; future identity decoupling must resolve idAniList at this boundary.
export function processMediaStaffQueue(): void {
	if (isProcessingStaffQueue) {
		return;
	}

	isProcessingStaffQueue = true;
	void runMediaStaffQueue().finally(() => {
		isProcessingStaffQueue = false;
	});
}

async function runMediaStaffQueue(): Promise<void> {
	const mediaIds = AnimeDbFacade.getMediasFromStaffQueue();

	if (mediaIds.length === 0) {
		return;
	}

	for (const mediaId of mediaIds) {
		await processSingleMediaStaff(mediaId);
	}
}

function loadStaffWithProgress(mediaId: number, mediaTitle: string, taskId: string): Promise<StaffEdge[]> {
	return lastValueFrom(AniListAPI.streamStaffForMedia(
		mediaId,
		"media-data",
		{
			queue:     "staff",
			mediaId,
			idAniList: mediaId,
			source:    "hydrator.staff",
			recovery:  "queue failure is persisted and retried by the staff hydrator",
		},
	).pipe(
		tap((event) => {
			if (event.kind !== "page-requested") {
				return;
			}

			publishHydratorTaskStarted({
				taskId,
				queue:   "staff",
				message: `Fetching staff for ${ mediaTitle } page ${ event.page }/many`,
			});
		}),
		filter(isAniListFetchCompletedEvent),
		map((event) => event.items),
	));
}

async function processSingleMediaStaff(mediaId: number): Promise<void> {
	const mediaTitle = AnimeDbFacade.getMediaName(mediaId);
	const taskId     = `staff:${ mediaId }`;

	AnimeDbFacade.markStaffQueueProcessing(mediaId);

	try {
		const staffEdges = await loadStaffWithProgress(
			mediaId,
			mediaTitle,
			taskId,
		);

		LoggerUtils.logMainInfo(
			"hydrator.staff.fetched-media",
			"Successfully fetched staff. Processing and storing in database.",
			{
				mediaIdAniList: mediaId,
				mediaName:      mediaTitle,
			},
		);

		try {
			AnimeDbFacade.processStaffBatch(
				mediaId,
				staffEdges,
			);
		} catch (error) {
			publishHydratorTaskFailed({
				taskId,
				queue:   "staff",
				message: `Failed to store staff for ${ mediaTitle }`,
			});
			const safeError = typeSafeError(error);
			AnimeDbFacade.updateFailedStaffQueue(
				mediaId,
				safeError.message,
			);
			return;
		}

		publishHydratorTaskCompleted({
			taskId,
			queue:   "staff",
			message: `Fetched staff for ${ mediaTitle }`,
		});
		LoggerUtils.logMainInfo(
			"hydrator.staff.completed-media",
			"Successfully stored staff in database. Removing from queue.",
			{
				mediaIdAniList: mediaId,
				mediaName:      mediaTitle,
			},
		);
		AnimeDbFacade.deleteFromStaffQueue(mediaId);
	} catch (error) {
		publishHydratorTaskFailed({
			taskId,
			queue:   "staff",
			message: `Failed to fetch staff for ${ mediaTitle }`,
		});
		const safeError = typeSafeError(error);
		LoggerUtils.logHydrationQueueError(
			"staff",
			mediaId,
			safeError,
		);
		AnimeDbFacade.updateFailedStaffQueue(
			mediaId,
			safeError.message,
		);
	}
}
