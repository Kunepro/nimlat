import { BUS_MediaEpisodesListChanged } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import { JikanHttpError } from "../../../api/jikan/jikan-errors";
import {
	publishHydratorTaskCompleted,
	publishHydratorTaskFailed,
} from "../../../services/hydrator/hydrator-progress-store";
import {
	type JikanEpisodesPhaseContext,
	processJikanEpisodesPhase,
	processJikanSynopsesPhase,
} from "./group-jikan-episodes-sync-phases";

let isProcessingJikanEpisodesQueue = false;

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

// Run the resumable Jikan episode snapshot pipeline one media at a time. Episode
// pages and per-episode synopses stage under one syncRunId; only finalization may
// replace canonical episode rows.
export function processJikanEpisodesQueue(): void {
	if (isProcessingJikanEpisodesQueue) {
		return;
	}

	isProcessingJikanEpisodesQueue = true;
	void runJikanEpisodesQueue().finally(() => {
		isProcessingJikanEpisodesQueue = false;
	});
}

async function runJikanEpisodesQueue(): Promise<void> {
	// Processing rows are intentionally reclaimable after process restart because
	// persisted phase/page checkpoints make the operation resumable.
	const mediaIds = AnimeDbFacade.getMediasFromGroupJikanEpisodesQueue();

	if (mediaIds.length === 0) {
		return;
	}

	LoggerUtils.logMainInfo(
		"hydrator.jikan-episodes.process-queue",
		`Processing ${ mediaIds.length } medias for Jikan episodes.`,
		{ count: mediaIds.length },
	);

	for (const mediaId of mediaIds) {
		await processSingleMediaJikanEpisodes(mediaId);
	}
}

async function processSingleMediaJikanEpisodes(mediaId: number): Promise<void> {
	// Sequential media processing respects Jikan limits and keeps one durable sync
	// lifecycle active per queue consumer.
	const mediaTitle = AnimeDbFacade.getMediaName(mediaId);
	const taskId     = `jikan-episodes:${ mediaId }`;
	AnimeDbFacade.markGroupJikanEpisodesQueueProcessing(mediaId);
	const requestPriority = AnimeDbFacade.hasMediaEpisodeUpdatesManualPriority(mediaId) ? 10 : 0;

	// Queue ownership stays canonical by mediaId. Provider-native IDs are resolved only
	// at the external API boundary.
	const providerIds = AnimeDbFacade.media.getProviderIds(mediaId);
	const malId       = providerIds.idMal;
	if (!malId) {
		LoggerUtils.logMainInfo(
			"hydrator.jikan-episodes.skipped-no-mal-id",
			"Skipped Jikan episodes hydration because this media has no MAL id mapping.",
			{
				mediaId,
				idAniList: providerIds.idAniList,
				mediaName: mediaTitle,
			},
		);
		AnimeDbFacade.clearJikanEpisodesSyncState(mediaId);
		AnimeDbFacade.deleteFromGroupJikanEpisodesQueue(mediaId);
		return;
	}

	try {
		const phaseContext: JikanEpisodesPhaseContext = {
			mediaId,
			malId,
			mediaTitle,
			taskId,
			requestPriority,
		};
		let syncState                                 = AnimeDbFacade.getOrCreateJikanEpisodesSyncState(mediaId);

		syncState = await processJikanEpisodesPhase(
			phaseContext,
			syncState,
		);
		syncState = await processJikanSynopsesPhase(
			phaseContext,
			syncState,
		);

		// Publish no completion until the staged snapshot atomically replaces final
		// episode rows; partial phases must remain invisible to readers.
		const finalizeResult = AnimeDbFacade.finalizeJikanEpisodesSync(
			mediaId,
			syncState.syncRunId,
		);
		AnimeDbFacade.enqueueJikanEpisodeThumbnailsQueue(
			mediaId,
			{ resetProgress: true },
		);
		publishHydratorTaskCompleted({
			taskId,
			queue:   "jikan-episodes",
			message: `Synchronized episodes for ${ mediaTitle }`,
		});

		LoggerUtils.logMainInfo(
			"hydrator.jikan-episodes.completed-media",
			"Successfully synchronized Jikan episodes snapshot. Removing from queue.",
			{
				mediaId,
				idAniList:   providerIds.idAniList,
				mediaIdMal:  malId,
				mediaName:   mediaTitle,
				writtenRows: finalizeResult.writtenRows,
				deletedRows: finalizeResult.deletedRows,
			},
		);

		AnimeDbFacade.deleteFromGroupJikanEpisodesQueue(mediaId);
		BUS_MediaEpisodesListChanged.next({ mediaId });
	} catch (error) {
		const normalizedError = normalizeCaughtError(error);
		publishHydratorTaskFailed({
			taskId,
			queue:   "jikan-episodes",
			message: `Failed to synchronize episodes for ${ mediaTitle }`,
		});
		LoggerUtils.logHydrationQueueError(
			"jikan-episodes",
			mediaId,
			normalizedError,
		);
		if (normalizedError instanceof JikanHttpError && normalizedError.status === 404) {
			AnimeDbFacade.markFailedGroupJikanEpisodesQueue(
				mediaId,
				normalizedError.message,
				"jikan_resource_unavailable",
			);
			return;
		}
		AnimeDbFacade.updateFailedGroupJikanEpisodesQueue(
			mediaId,
			normalizedError.message,
			"transient_failure",
		);
	}
}
