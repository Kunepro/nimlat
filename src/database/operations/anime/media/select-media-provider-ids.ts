import { MediaProviderIdsDto } from "@nimlat/types/anime-db";
import { getMediaProviderIds } from "./get-media-provider-ids";

// Single-row provider-id selector used by external integrations and download
// enrichment without exposing prepared statement helpers to facade consumers.
export function selectMediaProviderIds(mediaId: number): MediaProviderIdsDto {
	return getMediaProviderIds().get(mediaId);
}
