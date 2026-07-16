import type {
	HideErroredContentRequest,
	RetryAllErroredContentRequest,
	RetryErroredContentRequest,
} from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import {
	STMT_HIDE_CHARACTERS,
	STMT_HIDE_JIKAN_EPISODES,
	STMT_HIDE_JIKAN_THUMBNAILS,
	STMT_HIDE_STAFF,
	STMT_RETRY_ALL_CHARACTERS,
	STMT_RETRY_ALL_JIKAN_EPISODES,
	STMT_RETRY_ALL_JIKAN_THUMBNAILS,
	STMT_RETRY_ALL_STAFF,
	STMT_RETRY_CHARACTERS,
	STMT_RETRY_JIKAN_EPISODES,
	STMT_RETRY_JIKAN_THUMBNAILS,
	STMT_RETRY_STAFF,
	STMT_SELECT_RETRYABLE_JIKAN_EPISODE_MEDIA_IDS,
	STMT_UPSERT_JIKAN_EPISODES_PRIORITY,
} from "./failed-hydration-items-command-statements";
import { selectErroredContentItem } from "./failed-hydration-items-read";

export function retryErroredContentQueueItem(request: RetryErroredContentRequest): boolean {
	const db  = getDatabase();
	const now = Date.now();

	if (request.queue === "characters") {
		return db.prepare<number>(STMT_RETRY_CHARACTERS)
			.run(request.mediaId).changes > 0;
	}

	if (request.queue === "staff") {
		return db.prepare<number>(STMT_RETRY_STAFF)
			.run(request.mediaId).changes > 0;
	}

	if (request.queue === "jikan-episode-thumbnails") {
		return db.prepare<[ number, number ]>(STMT_RETRY_JIKAN_THUMBNAILS)
			.run(
				now,
				request.mediaId,
			).changes > 0;
	}

	// Jikan episode retries also seed manual priority, so the daemon picks the
	// retried media before background queue work.
	const retryJikanEpisodes = db.transaction(() => {
		const result = db.prepare<number>(STMT_RETRY_JIKAN_EPISODES)
			.run(request.mediaId);
		if (result.changes <= 0) {
			return false;
		}

		db.prepare<[ number, number ]>(STMT_UPSERT_JIKAN_EPISODES_PRIORITY)
			.run(
				request.mediaId,
				now,
			);
		return true;
	});

	return retryJikanEpisodes();
}

export function retryAllErroredContentQueueItems(request: RetryAllErroredContentRequest): number {
	const db       = getDatabase();
	const now      = Date.now();
	const queue    = request.queue ?? null;
	let retryCount = 0;

	const retryCharacters      = (): void => {
		retryCount += db.prepare(STMT_RETRY_ALL_CHARACTERS)
			.run().changes;
	};
	const retryStaff           = (): void => {
		retryCount += db.prepare(STMT_RETRY_ALL_STAFF)
			.run().changes;
	};
	const retryJikanEpisodes   = (): void => {
		const mediaIds = db.prepare<[], { mediaId: number }>(STMT_SELECT_RETRYABLE_JIKAN_EPISODE_MEDIA_IDS)
			.all()
			.map(row => row.mediaId);
		if (mediaIds.length === 0) {
			return;
		}

		retryCount += db.prepare(STMT_RETRY_ALL_JIKAN_EPISODES)
			.run().changes;
		const priorityStmt = db.prepare<[ number, number ]>(STMT_UPSERT_JIKAN_EPISODES_PRIORITY);
		mediaIds.forEach(mediaId => priorityStmt.run(
			mediaId,
			now,
		));
	};
	const retryJikanThumbnails = (): void => {
		retryCount += db.prepare<number>(STMT_RETRY_ALL_JIKAN_THUMBNAILS)
			.run(now).changes;
	};

	db.transaction(() => {
		if (queue === null || queue === "characters") retryCharacters();
		if (queue === null || queue === "staff") retryStaff();
		if (queue === null || queue === "jikan-episodes") retryJikanEpisodes();
		if (queue === null || queue === "jikan-episode-thumbnails") retryJikanThumbnails();
	})();

	return retryCount;
}

export function hideErroredContentQueueItem(request: HideErroredContentRequest): boolean {
	const db   = getDatabase();
	const item = selectErroredContentItem(request);
	if (!item) {
		return false;
	}

	const now = Date.now();
	if (request.queue === "characters") {
		return db.prepare<[ number, number ]>(STMT_HIDE_CHARACTERS)
			.run(
				now,
				request.mediaId,
			).changes > 0;
	}
	if (request.queue === "staff") {
		return db.prepare<[ number, number ]>(STMT_HIDE_STAFF)
			.run(
				now,
				request.mediaId,
			).changes > 0;
	}
	if (request.queue === "jikan-episode-thumbnails") {
		return db.prepare<[ number, number ]>(STMT_HIDE_JIKAN_THUMBNAILS)
			.run(
				now,
				request.mediaId,
			).changes > 0;
	}
	return db.prepare<[ number, number ]>(STMT_HIDE_JIKAN_EPISODES)
		.run(
			now,
			request.mediaId,
		).changes > 0;
}
