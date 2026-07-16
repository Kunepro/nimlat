import { getDatabase } from "../../../utils/get-db";
import { resolveAniListCompatibleMediaIdByCanonicalMediaId } from "./canonical-id-resolution";

// Keep DB ownership inside an anime_data operation so facades do not pass raw
// database handles around while resolving provider-compatible identities.
export function selectAniListCompatibleMediaIdByCanonicalMediaId(mediaId: number): number {
	return resolveAniListCompatibleMediaIdByCanonicalMediaId(
		getDatabase(),
		mediaId,
	);
}
