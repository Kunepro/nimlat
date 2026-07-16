import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { AniListCharacter } from "@nimlat/types/ani-list-media-api";
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

let isProcessingGroupCharactersQueue = false;

// Process character enrichment sequentially with persisted claim markers so a
// scheduler sweep cannot duplicate the in-flight provider request. V1 canonical
// media IDs are seeded from AniList IDs; when those identities diverge, resolve
// idAniList before calling streamCharactersForMedia instead of passing mediaId.
export function processMediaCharactersQueue(): void {
	if (isProcessingGroupCharactersQueue) {
		return;
	}

	isProcessingGroupCharactersQueue = true;
	void runMediaCharactersQueue().finally(() => {
		isProcessingGroupCharactersQueue = false;
	});
}

async function runMediaCharactersQueue(): Promise<void> {
	const mediaIds = AnimeDbFacade.getMediasFromGroupCharactersQueue();

	if (mediaIds.length === 0) {
		return;
	}

	for (const mediaId of mediaIds) {
		await processSingleMediaCharacters(mediaId);
	}
}

function loadCharactersWithProgress(mediaId: number, mediaTitle: string, taskId: string): Promise<AniListCharacter[]> {
	return lastValueFrom(AniListAPI.streamCharactersForMedia(
		mediaId,
		"media-data",
		{
			queue:     "characters",
			mediaId,
			idAniList: mediaId,
			source:    "hydrator.characters",
			recovery:  "queue failure is persisted and retried by the characters hydrator",
		},
	).pipe(
		tap((event) => {
			if (event.kind !== "page-requested") {
				return;
			}

			publishHydratorTaskStarted({
				taskId,
				queue:   "characters",
				message: `Fetching characters for ${ mediaTitle } page ${ event.page }/many`,
			});
		}),
		filter(isAniListFetchCompletedEvent),
		map((event) => event.items),
	));
}

async function processSingleMediaCharacters(mediaId: number): Promise<void> {
	const mediaTitle = AnimeDbFacade.getMediaName(mediaId);
	const taskId     = `characters:${ mediaId }`;

	AnimeDbFacade.markGroupCharactersQueueProcessing(mediaId);

	try {
		const characters = await loadCharactersWithProgress(
			mediaId,
			mediaTitle,
			taskId,
		);

		LoggerUtils.logMainInfo(
			"hydrator.characters.fetched-media",
			"Successfully fetched characters. Processing and storing in database.",
			{
				mediaIdAniList: mediaId,
				mediaName:      mediaTitle,
			},
		);

		try {
			AnimeDbFacade.processCharactersBatch(
				mediaId,
				characters,
			);
		} catch (error) {
			publishHydratorTaskFailed({
				taskId,
				queue:   "characters",
				message: `Failed to store characters for ${ mediaTitle }`,
			});
			const safeError = typeSafeError(error);
			AnimeDbFacade.updateFailedGroupCharactersQueue(
				mediaId,
				safeError.message,
			);
			return;
		}

		publishHydratorTaskCompleted({
			taskId,
			queue:   "characters",
			message: `Fetched characters for ${ mediaTitle }`,
		});
		LoggerUtils.logMainInfo(
			"hydrator.characters.completed-media",
			"Successfully stored characters in database. Removing from queue.",
			{
				mediaIdAniList: mediaId,
				mediaName:      mediaTitle,
			},
		);
		AnimeDbFacade.deleteFromGroupCharactersQueue(mediaId);
	} catch (error) {
		publishHydratorTaskFailed({
			taskId,
			queue:   "characters",
			message: `Failed to fetch characters for ${ mediaTitle }`,
		});
		const safeError = typeSafeError(error);
		LoggerUtils.logHydrationQueueError(
			"characters",
			mediaId,
			safeError,
		);
		AnimeDbFacade.updateFailedGroupCharactersQueue(
			mediaId,
			safeError.message,
		);
	}
}
