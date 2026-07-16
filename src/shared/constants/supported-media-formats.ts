import { AniListMedia } from "@nimlat/types/ani-list-media-api";

export const SUPPORTED_ANIMATED_MEDIA_FORMATS = [
	"TV",
	"TV_SHORT",
	"MOVIE",
	"SPECIAL",
	"OVA",
	"ONA",
] as const;

export type SupportedAnimatedMediaFormat = (typeof SUPPORTED_ANIMATED_MEDIA_FORMATS)[number];

const SUPPORTED_ANIMATED_MEDIA_FORMAT_SET = new Set<string>(SUPPORTED_ANIMATED_MEDIA_FORMATS);

/**
 * Relation nodes can arrive with raw AniList formats outside our narrowed TypeScript union,
 * so this check intentionally accepts any string-like input.
 */
export function isSupportedAnimatedMediaFormat(format: string | null | undefined): format is SupportedAnimatedMediaFormat {
	return typeof format === "string" && SUPPORTED_ANIMATED_MEDIA_FORMAT_SET.has(format);
}

/**
 * Nimlat only keeps animated AniList media rows that match the app-supported formats.
 */
export function isSupportedAnimatedAniListMedia(media: Pick<AniListMedia, "type" | "format">): boolean {
	return media.type === "ANIME" && isSupportedAnimatedMediaFormat(media.format);
}
