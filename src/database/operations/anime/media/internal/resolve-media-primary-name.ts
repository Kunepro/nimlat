import { AniListMedia } from "@nimlat/types/ani-list-media-api";

// Resolve the persisted display name with a deterministic language fallback.
// AniList often omits English; returning null only when every title is absent
// prevents accidental "undefined" names while leaving DB fallback policy explicit.
export function resolveMediaPrimaryName(title: AniListMedia["title"] | null | undefined): string | null {
	return title?.english || title?.romaji || title?.native || null;
}
