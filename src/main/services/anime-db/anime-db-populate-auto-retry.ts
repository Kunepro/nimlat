import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	type AnimeDbPopulateCursorState,
	resolveScanAutoRetryDelaySeconds,
	SCAN_AUTO_RETRY_MAX_ATTEMPTS,
} from "./populate-anime-db-policy";

export interface AnimeDbPopulateAutoRetryPlan {
	attempt: number;
	retryDelaySeconds: number;
	progressPatch: Pick<
		PopulateAnimeDbProgressData,
		| "currentStatus"
		| "errorMessage"
		| "autoRetryAttempt"
		| "autoRetryMaxAttempts"
		| "nextRetryAt"
		| "currentPage"
		| "lastProcessedId"
	>;
	logContext: {
		attempt: number;
		maxAttempts: number;
		retryDelaySeconds: number;
		persistedCompletedPage: number;
		nextPage: number;
		persistedLastMediaId: number;
		persistedMediaCount: number;
	};
}

// Pure retry-state builder. The coordinator owns logging/persistence; this
// helper owns the backoff and progress shape so retries stay consistent.
export function createAnimeDbPopulateAutoRetryPlan(input: {
	currentAttempt: number;
	error: Error;
	cursor: AnimeDbPopulateCursorState;
	now: number;
}): AnimeDbPopulateAutoRetryPlan | null {
	if (input.currentAttempt >= SCAN_AUTO_RETRY_MAX_ATTEMPTS) {
		return null;
	}

	const attempt           = input.currentAttempt + 1;
	const retryDelaySeconds = resolveScanAutoRetryDelaySeconds(attempt - 1);
	const nextPage          = Math.max(
		1,
		input.cursor.persistedCompletedPage + 1,
	);

	return {
		attempt,
		retryDelaySeconds,
		progressPatch: {
			currentStatus:        "retrying",
			errorMessage:         input.error.message,
			autoRetryAttempt:     attempt,
			autoRetryMaxAttempts: SCAN_AUTO_RETRY_MAX_ATTEMPTS,
			nextRetryAt:          input.now + (retryDelaySeconds * 1000),
			currentPage:          nextPage,
			lastProcessedId:      input.cursor.persistedLastMediaId || undefined,
		},
		logContext:    {
			attempt,
			maxAttempts:            SCAN_AUTO_RETRY_MAX_ATTEMPTS,
			retryDelaySeconds,
			persistedCompletedPage: input.cursor.persistedCompletedPage,
			nextPage,
			persistedLastMediaId:   input.cursor.persistedLastMediaId,
			persistedMediaCount:    input.cursor.persistedMediaCount,
		},
	};
}
