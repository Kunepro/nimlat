import { AnimeDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import { JikanHttpError } from "../../../api/jikan/jikan-errors";
import { MediaProviderRegistry } from "../../../providers/media-provider-registry";
import { publishHydratorTaskStarted } from "../../../services/hydrator/hydrator-progress-store";

const JIKAN_EPISODE_DETAILS_PRIORITY_OFFSET = -100;

export type JikanEpisodesPhaseContext = {
	mediaId: number;
	malId: number;
	mediaTitle: string;
	taskId: string;
	requestPriority: number;
};

export type JikanEpisodesSyncState = ReturnType<typeof AnimeDbFacade.getOrCreateJikanEpisodesSyncState>;

// Phase 1 persists canonical Jikan episode-list rows into staging until pagination is exhausted.
// Synopsis/detail calls have a separate cursor so page-list progress is not tied to per-episode detail work.
export async function processJikanEpisodesPhase(
	context: JikanEpisodesPhaseContext,
	syncState: JikanEpisodesSyncState,
): Promise<JikanEpisodesSyncState> {
	if (syncState.phase !== "episodes") {
		return syncState;
	}

	let currentSyncState = syncState;
	while (currentSyncState.hasNextEpisodesPage) {
		const nextPage = currentSyncState.lastEpisodesPage + 1;
		publishHydratorTaskStarted({
			taskId:  context.taskId,
			queue:   "jikan-episodes",
			message: `Fetching episodes for ${ context.mediaTitle } page ${ nextPage }/many`,
		});
		const response = await MediaProviderRegistry.getJikanEpisodesProvider().loadEpisodesPageForMedia(
			context.malId,
			nextPage,
			context.requestPriority,
		);

		AnimeDbFacade.upsertJikanEpisodesStagingPage(
			context.mediaId,
			currentSyncState.syncRunId,
			response.data,
		);
		AnimeDbFacade.updateJikanEpisodesSyncEpisodesProgress(
			context.mediaId,
			nextPage,
			response.pagination.has_next_page,
		);

		currentSyncState = {
			...currentSyncState,
			phase:               response.pagination.has_next_page ? "episodes" : "synopses",
			lastEpisodesPage:    nextPage,
			hasNextEpisodesPage: response.pagination.has_next_page,
		};
	}

	return currentSyncState;
}

// Phase 2 persists one Jikan episode-detail response at a time, then advances its
// own cursor. A crash can replay the current detail request without replaying the
// episode-list pages that are already staged.
export async function processJikanSynopsesPhase(
	context: JikanEpisodesPhaseContext,
	syncState: JikanEpisodesSyncState,
): Promise<JikanEpisodesSyncState> {
	if (syncState.phase !== "synopses") {
		return syncState;
	}

	const provider       = MediaProviderRegistry.getJikanEpisodesProvider();
	let currentSyncState = syncState;
	while (currentSyncState.hasNextSynopsisEpisode) {
		const candidate = AnimeDbFacade.getNextJikanEpisodeSynopsisCandidate(
			context.mediaId,
			currentSyncState.syncRunId,
			currentSyncState.lastSynopsisEpisodeNumber,
		);
		if (!candidate) {
			AnimeDbFacade.updateJikanEpisodesSyncSynopsisProgress(
				context.mediaId,
				currentSyncState.lastSynopsisEpisodeNumber,
				false,
			);
			return {
				...currentSyncState,
				phase:                  "finalize",
				hasNextSynopsisEpisode: false,
			};
		}

		publishHydratorTaskStarted({
			taskId:  context.taskId,
			queue:   "jikan-episodes",
			message: `Fetching episode details for ${ context.mediaTitle } episode ${ candidate.episodeNumber }`,
		});
		try {
			const detail = await provider.loadEpisodeDetailsForMedia(
				context.malId,
				candidate.episodeNumber,
				context.requestPriority + JIKAN_EPISODE_DETAILS_PRIORITY_OFFSET,
			);
			AnimeDbFacade.applyJikanEpisodeSynopsisToStagingEpisode(
				context.mediaId,
				currentSyncState.syncRunId,
				candidate.episodeNumber,
				{
					duration: detail.data.duration ?? null,
					synopsis: detail.data.synopsis ?? null,
				},
			);
		} catch (error) {
			if (error instanceof JikanHttpError && error.status === 404) {
				LoggerUtils.logMainInfo(
					"hydrator.jikan-episodes.synopsis-unavailable",
					"Skipped one Jikan episode synopsis because the detail endpoint returned 404.",
					{
						mediaId:       context.mediaId,
						mediaName:     context.mediaTitle,
						mediaIdMal:    context.malId,
						episodeNumber: candidate.episodeNumber,
					},
				);
			} else {
				throw error;
			}
		}

		AnimeDbFacade.updateJikanEpisodesSyncSynopsisProgress(
			context.mediaId,
			candidate.episodeNumber,
			true,
		);
		currentSyncState = {
			...currentSyncState,
			lastSynopsisEpisodeNumber: candidate.episodeNumber,
			hasNextSynopsisEpisode:    true,
		};
	}

	return currentSyncState;
}
