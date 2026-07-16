import { isSupportedAnimatedAniListMedia } from "@nimlat/constants/supported-media-formats";
import { logAniListMediaById } from "@nimlat/loggers/main";
import {
	ANILIST_API,
	AniListMedia,
} from "@nimlat/types/ani-list-media-api";
import { request } from "graphql-request";
import { ANILIST_MEDIA_FIELDS } from "./ani-list.media-fields";
import { sanitizeAniListMedia } from "./sanitize-ani-list-media";

interface MediaByIdResponse {
	Media: AniListMedia | null;
}

// Fetch, validate, and diagnostically log one complete AniList media payload by
// provider-native ID. Persistence, toaster messages, and UI effects remain with
// the targeted-refresh caller.
export async function getAnimeMediaById(mediaId: number): Promise<AniListMedia> {
	const query = `
		query ($id: Int) {
			Media(id: $id, type: ANIME) {
				${ ANILIST_MEDIA_FIELDS }
			}
		}
	`;

	const response = await request<MediaByIdResponse>(
		ANILIST_API,
		query,
		{ id: mediaId },
	);

	if (!response.Media) {
		throw new Error(`AniList returned no media for id ${ mediaId }.`);
	}
	const sanitizedMedia = sanitizeAniListMedia(response.Media);
	if (!isSupportedAnimatedAniListMedia(sanitizedMedia)) {
		throw new Error(`AniList media ${ mediaId } uses unsupported format ${ sanitizedMedia.format ?? "unknown" }.`);
	}
	logAniListMediaById(
		sanitizedMedia,
		{ mediaId },
	);
	return sanitizedMedia;
}
