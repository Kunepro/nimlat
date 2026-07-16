import type { ReleaseWatchMediaFactsDto } from "@nimlat/types/anime-db";
import type { MediaId } from "@nimlat/types/nimlat-ids";

export const RELEASE_REFRESH_GRACE_MS   = 2 * 60 * 60 * 1000;
export const RELEASE_REFRESH_BACKOFF_MS = [
	6 * 60 * 60 * 1000,
	18 * 60 * 60 * 1000,
	42 * 60 * 60 * 1000,
	90 * 60 * 60 * 1000,
] as const;

export function uniqueMediaIds(mediaIds: MediaId[]): MediaId[] {
	return Array.from(new Set(mediaIds));
}

export function isFullyIntegrated(facts: ReleaseWatchMediaFactsDto): boolean {
	return facts.integrationStatus === "integrated"
		&& (facts.integrationPercent == null || facts.integrationPercent >= 100);
}

export function serializePayload(payload: Record<string, unknown>): string {
	return JSON.stringify(payload);
}
