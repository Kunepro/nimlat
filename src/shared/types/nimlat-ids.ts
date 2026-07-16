// Canonical and provider identifiers remain numeric aliases for compatibility,
// but their ownership is distinct. Nimlat owns canonical IDs even where V1 seeds
// their numeric values from AniList; code must not rely on that equality at an
// external-provider boundary.

// Canonical Nimlat identity for a title-level Media row (series, season, OVA, or film).
export type MediaId = number;

// Canonical Nimlat identity for an episode row. Some compatibility queries still
// use mediaId + episodeNumber and must explicitly resolve this bridge.
export type EpisodeId = number;

// Canonical identity for an official/default Group lineage. Compatibility fields
// may still expose baseMediaId, but durable user rows store this lineage identity.
export type GroupLineageId = number;

// Local identity of one official Group row in anime_data. It is replaceable with
// the AnimeDB asset and meaningful only together with the official source domain.
export type OfficialGroupId = number;

// Local identity of one installation-owned Group row in user_data.
export type UserGroupId = number;

// Group IDs overlap across persistence domains, so mixed Library reads must carry
// the owner explicitly rather than treating the numeric id as globally unique.
export type GroupSource = "official" | "user";

// Stable cross-layer Group reference; source + id form the actual identity.
export interface GroupRef {
	source: GroupSource;
	groupId: OfficialGroupId | UserGroupId;
}

// Renderer-visible discriminator for the mixed Group/raw-media Library list.
export type LibraryItemKind = "group" | "media";

// String key for virtualized Library rows spanning multiple identity domains.
export type LibraryItemKey = string;

// Provider-native AniList media identity; never substitute it implicitly for MediaId.
export type AniListMediaId = number;

// Provider-native MyAnimeList identity used by Jikan endpoints.
export type MalMediaId = number;
