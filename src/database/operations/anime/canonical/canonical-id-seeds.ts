import {
	EpisodeId,
	GroupLineageId,
	MediaId,
} from "@nimlat/types/nimlat-ids";

const EPISODE_ID_FACTOR = 1_000_000;

// AnimeDB V1 seeds canonical media IDs from AniList for compatibility. Ownership,
// not the current numeric equality, is the contract: provider calls must still use
// an explicitly resolved idAniList.
export function seedCanonicalMediaIdFromAniListId(idAniList: number): MediaId {
	return idAniList;
}

// Seed episode IDs deterministically from canonical media identity and the current
// business episode number. This is a compatibility bridge, not a provider identity.
export function seedCanonicalEpisodeId(mediaId: MediaId, episodeNumber: number): EpisodeId {
	if (!Number.isInteger(mediaId) || mediaId <= 0) {
		throw new Error(`Cannot seed canonical episode ID from invalid mediaId ${ mediaId }`);
	}

	if (!Number.isInteger(episodeNumber) || episodeNumber < 0 || episodeNumber >= EPISODE_ID_FACTOR) {
		throw new Error(`Cannot seed canonical episode ID from invalid episodeNumber ${ episodeNumber }`);
	}

	return mediaId * EPISODE_ID_FACTOR + episodeNumber;
}

// V1 lineage IDs mirror their initial base-media anchor. Reconciliation must use
// lineage ownership, not assume this numeric equality survives future schemas.
export function seedCanonicalGroupLineageId(baseMediaId: MediaId): GroupLineageId {
	return baseMediaId;
}
