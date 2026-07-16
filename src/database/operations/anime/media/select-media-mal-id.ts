import { getMediaMalId } from "../media-hydration/media-mal-id";

// Resolve the MAL id as an optional provider identifier; callers must continue
// to use mediaId as the canonical internal ownership key.
export function selectMediaMalId(mediaId: number): number | undefined {
	const result = getMediaMalId().get(mediaId);
	const malId  = result?.idMal;
	return typeof malId === "number" ? malId : undefined;
}
