import {
	ErroredContentPage,
	HideErroredContentRequest,
	RetryErroredContentRequest,
} from "@nimlat/types/ipc-payloads";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	hideErroredContentQueueItem,
	retryErroredContentQueueItem,
} from "./media-hydration/failed-hydration-items-commands";
import {
	selectErroredContentItem,
	selectErroredContentPage,
} from "./media-hydration/failed-hydration-items-read";
import { retryAllErroredContentByQueue } from "./media-hydration/retry-all-errored-content-by-queue";

// Errored-content facade panel for global hydration/request failure inspection
// and manual retry/hide actions.
export const AnimeDbErroredContentFacade = {
	listErroredContent(
		offset: number,
		limit: number,
		queue?: RetryErroredContentRequest["queue"] | null,
		includeHidden?: boolean,
	): ErroredContentPage {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.listErroredContent",
			() => selectErroredContentPage(
				offset,
				limit,
				queue,
				includeHidden,
			),
			{
				offset,
				limit,
				queue,
				includeHidden,
			},
		);
	},

	getErroredContent(request: HideErroredContentRequest): ErroredContentPage["items"][number] | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getErroredContent",
			() => selectErroredContentItem(request),
			{ ...request },
		);
	},

	retryErroredContent(request: RetryErroredContentRequest): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.retryErroredContent",
			() => retryErroredContentQueueItem(request),
			{ ...request },
		);
	},

	retryAllErroredContent(queue: RetryErroredContentRequest["queue"] | null): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.retryAllErroredContent",
			() => retryAllErroredContentByQueue(queue),
			{ queue },
		);
	},

	hideErroredContent(request: HideErroredContentRequest): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hideErroredContent",
			() => hideErroredContentQueueItem(request),
			{ ...request },
		);
	},
} as const;
