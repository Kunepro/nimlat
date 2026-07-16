import { BUS_MediaEpisodesListChanged } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import { JikanHttpError } from "../../../api/jikan/jikan-errors";
import { MediaProviderRegistry } from "../../../providers/media-provider-registry";
import {
	publishHydratorTaskCompleted,
	publishHydratorTaskFailed,
	publishHydratorTaskStarted,
} from "../../../services/hydrator/hydrator-progress-store";

let isProcessingJikanEpisodeThumbnailsQueue = false;

function normalizeCaughtError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === "string") {
		return new Error(error);
	}

	try {
		return new Error(JSON.stringify(error));
	} catch {
		return new Error("Unknown error");
	}
}

// Process thumbnail enrichment independently from canonical episode fetching.
// The queue row owns pagination progress, so retries resume at lastPage + 1.
export function processJikanEpisodeThumbnailsQueue(): void {
	if (isProcessingJikanEpisodeThumbnailsQueue) {
		return;
	}

	isProcessingJikanEpisodeThumbnailsQueue = true;
	void runJikanEpisodeThumbnailsQueue().finally(() => {
		isProcessingJikanEpisodeThumbnailsQueue = false;
	});
}

async function runJikanEpisodeThumbnailsQueue(): Promise<void> {
	const mediaIds = AnimeDbFacade.getMediasFromJikanEpisodeThumbnailsQueue();
	if (mediaIds.length === 0) {
		return;
	}

	LoggerUtils.logMainInfo(
		"hydrator.jikan-episode-thumbnails.process-queue",
		`Processing ${ mediaIds.length } medias for Jikan episode thumbnails.`,
		{ count: mediaIds.length },
	);

	for (const mediaId of mediaIds) {
		await processSingleMediaJikanEpisodeThumbnails(mediaId);
	}
}

async function processSingleMediaJikanEpisodeThumbnails(mediaId: number): Promise<void> {
	const mediaTitle = AnimeDbFacade.getMediaName(mediaId);
	const taskId     = `jikan-episode-thumbnails:${ mediaId }`;
	AnimeDbFacade.markJikanEpisodeThumbnailsQueueProcessing(mediaId);

	const providerIds = AnimeDbFacade.media.getProviderIds(mediaId);
	const malId       = providerIds.idMal;
	if (!malId) {
		AnimeDbFacade.deleteFromJikanEpisodeThumbnailsQueue(mediaId);
		return;
	}

	const queueEntry = AnimeDbFacade.getJikanEpisodeThumbnailsQueueEntry(mediaId);
	if (!queueEntry || !queueEntry.hasNextPage) {
		AnimeDbFacade.deleteFromJikanEpisodeThumbnailsQueue(mediaId);
		return;
	}

	try {
		if (queueEntry.lastPage === 0) {
			const clearedRows = AnimeDbFacade.clearJikanEpisodeThumbnailsForMedia(mediaId);
			if (clearedRows > 0) {
				LoggerUtils.logMainInfo(
					"hydrator.jikan-episode-thumbnails.cleared-stale-thumbnails",
					"Cleared existing episode thumbnails before a full Jikan thumbnail refresh.",
					{
						mediaId,
						mediaName: mediaTitle,
						clearedRows,
					},
				);
			}
		}

		let lastPage             = queueEntry.lastPage;
		let hasNextPage: boolean = queueEntry.hasNextPage;

		while (hasNextPage) {
			const nextPage = lastPage + 1;
			publishHydratorTaskStarted({
				taskId,
				queue:   "jikan-episode-thumbnails",
				message: `Fetching episode thumbnails for ${ mediaTitle } page ${ nextPage }/many`,
			});

			const response = await MediaProviderRegistry.getJikanEpisodesProvider().loadEpisodeVideosPageForMedia(
				malId,
				nextPage,
				queueEntry.priority ?? 0,
			);

			const updatedRows = AnimeDbFacade.applyJikanEpisodeVideoThumbnailsToEpisodesPage(
				mediaId,
				response.data,
			);
			AnimeDbFacade.updateJikanEpisodeThumbnailsProgress(
				mediaId,
				nextPage,
				response.pagination.has_next_page,
			);

			LoggerUtils.logMainInfo(
				"hydrator.jikan-episode-thumbnails.page-completed",
				"Applied one Jikan episode-thumbnail page.",
				{
					mediaId,
					mediaName:   mediaTitle,
					mediaIdMal:  malId,
					page:        nextPage,
					updatedRows,
					hasNextPage: response.pagination.has_next_page,
				},
			);

			lastPage    = nextPage;
			hasNextPage = response.pagination.has_next_page;
		}

		AnimeDbFacade.deleteFromJikanEpisodeThumbnailsQueue(mediaId);
		publishHydratorTaskCompleted({
			taskId,
			queue:   "jikan-episode-thumbnails",
			message: `Synchronized episode thumbnails for ${ mediaTitle }`,
		});
		BUS_MediaEpisodesListChanged.next({ mediaId });
	} catch (error) {
		const normalizedError = normalizeCaughtError(error);
		publishHydratorTaskFailed({
			taskId,
			queue:   "jikan-episode-thumbnails",
			message: `Failed to synchronize episode thumbnails for ${ mediaTitle }`,
		});
		LoggerUtils.logHydrationQueueError(
			"jikan-episode-thumbnails",
			mediaId,
			normalizedError,
		);
		if (normalizedError instanceof JikanHttpError && normalizedError.status === 404) {
			AnimeDbFacade.markFailedJikanEpisodeThumbnailsQueue(
				mediaId,
				normalizedError.message,
				"episode_video_thumbnails_unavailable",
			);
			return;
		}
		AnimeDbFacade.updateFailedJikanEpisodeThumbnailsQueue(
			mediaId,
			normalizedError.message,
			"transient_failure",
		);
	}
}
