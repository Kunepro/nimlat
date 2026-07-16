import type {
	MediaFormat,
	MediaStatus,
} from "@nimlat/types/ani-list-media-api";
import type {
	IntegrationStatus,
	ReleaseWatchMediaFactsDto,
	UserReleaseWatchStateDto,
	UserScheduledMediaRefreshDto,
} from "@nimlat/types/anime-db";
import type {
	ReleaseDatePrecision,
	ReleaseDateSource,
} from "@nimlat/types/release-watch";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

const MAX_RELEASE_WATCH_PAGE_LIMIT = 100;

export const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

export const PREFERRED_RELEASE_WATCH_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || releaseWatch.mediaId",
);

export type ReleaseWatchStateRow = {
	mediaId: number;
	watchDomain: UserReleaseWatchStateDto["watchDomain"];
	state: string;
	resolvedReleaseAt: number | null;
	releaseDatePrecision: ReleaseDatePrecision;
	releaseDateSource: ReleaseDateSource;
	integrationStatus: IntegrationStatus | null;
	integrationPercent: number | null;
	payloadJson: string | null;
	updatedAt: number;
	name: string | null;
	format: MediaFormat | null;
};

export type GroupTimelineMediaRow = {
	mediaId: number;
	name: string | null;
	format: MediaFormat | null;
	status: MediaStatus | null;
	nextAiringEpisode: number | null;
	nextAiringEpisodeJson: string | null;
	startDateYear: number | null;
	startDateMonth: number | null;
	startDateDay: number | null;
	integrationStatus: IntegrationStatus | null;
	integrationPercent: number | null;
};

export type ScheduledMediaRefreshRow = UserScheduledMediaRefreshDto;

export type ReleaseWatchMediaFactsRow = ReleaseWatchMediaFactsDto;

export type ReleaseWatchInterestReason = "tracked" | "related";

export function normalizeReleaseWatchLimit(limit: number): number {
	return Math.min(
		Math.max(
			Math.trunc(limit),
			1,
		),
		MAX_RELEASE_WATCH_PAGE_LIMIT,
	);
}

export function normalizeReleaseWatchOffset(offset: number): number {
	return Math.max(
		Math.trunc(offset),
		0,
	);
}

export function parseReleaseWatchPayload(payloadJson: string | null): Record<string, unknown> | undefined {
	if (!payloadJson) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(payloadJson) as unknown;
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return undefined;
	}

	return undefined;
}
