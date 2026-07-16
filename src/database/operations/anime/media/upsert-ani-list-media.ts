import { isSupportedAnimatedAniListMedia } from "@nimlat/constants/supported-media-formats";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { getDatabase } from "../../../utils/get-db";
import { insertAniListInsertErrorLog } from "../error-logs/insert-ani-list-insert-error-log";
import { enqueueMediaHydrationQueues } from "../media-hydration/queue-operations";
import { _upsertMedia } from "./internal/_upsert-media";
import { _upsertMediaCharacters } from "./internal/_upsert-media-characters";
import { _upsertMediaGenres } from "./internal/_upsert-media-genres";
import { _upsertMediaRelations } from "./internal/_upsert-media-relations";
import { _upsertMediaTags } from "./internal/_upsert-media-tags";

// Persist one complete AniList catalog payload and return its canonical media id.
// Media, tags, relations, and relation placeholders commit atomically. Secondary
// network enrichment is queued only after that transaction succeeds, so daemons
// never observe a media id whose canonical row failed to persist.
export function upsertAniListMedia(media: AniListMedia): number | undefined {
	if (!isSupportedAnimatedAniListMedia(media)) {
		return;
	}

	const db = getDatabase();

	const runInTransaction = db.transaction((currentMedia: AniListMedia) => {
		const mediaId = _upsertMedia(
			db,
			currentMedia,
		);
		_upsertMediaGenres(
			db,
			mediaId,
			currentMedia,
		);
		_upsertMediaTags(
			db,
			mediaId,
			currentMedia,
		);
		_upsertMediaCharacters(
			db,
			mediaId,
			currentMedia,
		);
		_upsertMediaRelations(
			db,
			currentMedia,
		);

		return mediaId;
	});

	let mediaId: number;
	// Keep the canonical media graph atomic; a partial relation/tag write must not
	// advance scanner or updater progress.
	try {
		mediaId = runInTransaction(media);
	} catch (dbError) {
		const tsDbError = typeSafeError(dbError);
		LoggerUtils.logMainServiceError(
			"anime-db.operations.medias.upsertAniListMedia.transaction",
			tsDbError,
			{ mediaIdAniList: media.id },
		);

		try {
			insertAniListInsertErrorLog(
				db,
				{
					idAniList: media.id,
					payload:   media,
					error:     tsDbError,
				},
			);
		} catch (logError) {
			const tsLogError = typeSafeError(logError);
			LoggerUtils.logMainServiceError(
				"anime-db.operations.medias.upsertAniListMedia.insert-error-log",
				tsLogError,
				{ mediaIdAniList: media.id },
			);
		}

		throw dbError;
	}

	// The scanner already supplied the complete AniList media payload. These queues
	// are only for independently retryable Characters, Staff, Jikan episode, and
	// thumbnail enrichment; they must not trigger another full media fetch.
	try {
		enqueueMediaHydrationQueues(mediaId);
	} catch (queueError) {
		LoggerUtils.logMainServiceError(
			"anime-db.operations.medias.upsertAniListMedia.enqueue-hydration",
			typeSafeError(queueError),
			{ mediaIdAniList: media.id },
		);
		throw queueError;
	}

	return mediaId;
}
