import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "./anime/resolve-media-image-url";

export type GroupMediaCardRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	format: string | null;
	hasHydrationIssue: number;
	hasPlaybackIssue: number;
	isAdult?: number | null;
	isWatched: number;
	lastRefreshAt: number | null;
	mediaDescription: string | null;
	mediaId: number;
	mediaIntegrationPercent: number | null;
	mediaIntegrationStatus: IntegrationStatus | null;
	mediaName: string | null;
};

function toLastRefreshIso(lastRefreshAt: number | null): string {
	return lastRefreshAt
		? new Date(lastRefreshAt).toISOString()
		: new Date(0).toISOString();
}

export function mapGroupMediaCardRow(row: GroupMediaCardRow): GroupInspectionMediaCard {
	return {
		description:        row.mediaDescription || undefined,
		format:             row.format || undefined,
		hasHydrationIssue:  row.hasHydrationIssue === 1,
		hasPlaybackIssue:   row.hasPlaybackIssue === 1,
		imageUrl:           resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		integrationPercent: row.mediaIntegrationPercent ?? undefined,
		integrationStatus:  normalizeIntegrationStatus(row.mediaIntegrationStatus) ?? undefined,
		...(typeof row.isAdult === "number"
			? { isAdult: row.isAdult === 1 }
			: {}),
		isFilm:      row.format === "MOVIE",
		isWatched:   row.isWatched === 1,
		lastRefresh: toLastRefreshIso(row.lastRefreshAt),
		mediaId:     row.mediaId,
		name:        row.mediaName || `Media ${ row.mediaId }`,
	};
}
