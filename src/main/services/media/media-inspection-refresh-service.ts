import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	MediaAdHocRefreshFactsDto,
	MediaEpisodeUpdatesIssueReason,
} from "@nimlat/types/anime-db";
import { MediaProviderRegistry } from "../../providers/media-provider-registry";
import { ingestAnimeDbMedia } from "../anime-db/anime-db-media-ingestion";
import { NetworkStatusReadService } from "../network/network-status-read-service";

const RECENT_AIRING_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_INSPECTION_REFRESH_SUPPRESSION_MS = 5 * 60 * 1000;

const ACTIVE_QUEUE_STATUSES = new Set([
	"pending",
	"processing",
]);

const TERMINAL_EPISODE_FAILURE_REASONS = new Set<MediaEpisodeUpdatesIssueReason>([
	"missing_mal_id",
	"jikan_resource_unavailable",
]);

const cooldownUntilByMediaId = new Map<number, number>();
const inFlightCatalogRefreshMediaIds = new Set<number>();

type RefreshDecision = {
	shouldRefreshCatalog: boolean;
	shouldHydrateEpisodes: boolean;
};

function isNetworkOnline(): boolean {
	return NetworkStatusReadService.isOnline();
}

function parseAiringAtFromJson(nextAiringEpisodeJson?: string | null): number | null {
	if (!nextAiringEpisodeJson) {
		return null;
	}

	try {
		const parsed = JSON.parse(nextAiringEpisodeJson) as { airingAt?: unknown };
		return typeof parsed.airingAt === "number" && Number.isFinite(parsed.airingAt)
			? parsed.airingAt * 1000
			: null;
	} catch {
		return null;
	}
}

function resolveAiringAtMs(facts: MediaAdHocRefreshFactsDto): number | null {
	if (typeof facts.nextAiringEpisode === "number" && Number.isFinite(facts.nextAiringEpisode)) {
		return facts.nextAiringEpisode > 10_000_000_000
			? facts.nextAiringEpisode
			: facts.nextAiringEpisode * 1000;
	}

	return parseAiringAtFromJson(facts.nextAiringEpisodeJson);
}

function isNextAiringDueForLocalRefresh(facts: MediaAdHocRefreshFactsDto, now: number): boolean {
	const airingAtMs = resolveAiringAtMs(facts);
	if (!airingAtMs || airingAtMs > now || now - airingAtMs > RECENT_AIRING_LOOKBACK_MS) {
		return false;
	}

	return (facts.lastUpdatedAt ?? 0) < airingAtMs;
}

function hasMissingExpectedEpisodes(facts: MediaAdHocRefreshFactsDto): boolean {
	// A completed empty Jikan snapshot means the provider currently exposes no
	// episode rows for this media; do not turn that valid result into retry churn.
	if (facts.jikanEpisodesCoverageStatus === "empty") {
		return false;
	}

	return typeof facts.idMal === "number"
		&& typeof facts.episodesCount === "number"
		&& facts.episodesCount > 0
		&& facts.hydratedEpisodesCount < facts.episodesCount;
}

function hasRetryableEpisodeFailure(facts: MediaAdHocRefreshFactsDto): boolean {
	return facts.jikanEpisodesQueueStatus === "failed"
		&& !TERMINAL_EPISODE_FAILURE_REASONS.has(facts.jikanEpisodesFailureReason ?? "transient_failure");
}

function shouldHydrateEpisodes(facts: MediaAdHocRefreshFactsDto): boolean {
	if (facts.jikanEpisodesQueueStatus && ACTIVE_QUEUE_STATUSES.has(facts.jikanEpisodesQueueStatus)) {
		return false;
	}

	return hasMissingExpectedEpisodes(facts) || hasRetryableEpisodeFailure(facts);
}

function resolveDecision(facts: MediaAdHocRefreshFactsDto, now: number): RefreshDecision {
	return {
		shouldRefreshCatalog:  isNextAiringDueForLocalRefresh(
			facts,
			now,
		),
		shouldHydrateEpisodes: shouldHydrateEpisodes(facts),
	};
}

function isInspectionRefreshSuppressed(mediaId: number, now: number): boolean {
	return (cooldownUntilByMediaId.get(mediaId) ?? 0) > now;
}

function getSchedulableInspectionFacts(mediaId: number, now: number): MediaAdHocRefreshFactsDto | null {
	if (!isNetworkOnline() || isInspectionRefreshSuppressed(
		mediaId,
		now,
	)) {
		return null;
	}

	return AnimeDbFacade.media.getAdHocRefreshFacts(mediaId);
}

function hasRefreshWork(decision: RefreshDecision): boolean {
	return decision.shouldRefreshCatalog || decision.shouldHydrateEpisodes;
}

function markInspectionRefreshScheduled(mediaId: number, now: number): void {
	cooldownUntilByMediaId.set(
		mediaId,
		now + DUPLICATE_INSPECTION_REFRESH_SUPPRESSION_MS,
	);
}

function scheduleEpisodeHydrationIfNeeded(mediaId: number, decision: RefreshDecision): void {
	if (decision.shouldHydrateEpisodes) {
		AnimeDbFacade.retryMediaEpisodeUpdates(mediaId);
		BUS_HydratorQueueChanges.next();
	}
}

function scheduleCatalogRefreshIfNeeded(
	mediaId: number,
	facts: MediaAdHocRefreshFactsDto,
	decision: RefreshDecision,
): void {
	if (!decision.shouldRefreshCatalog || typeof facts.idAniList !== "number" || inFlightCatalogRefreshMediaIds.has(mediaId)) {
		return;
	}

	inFlightCatalogRefreshMediaIds.add(mediaId);
	void refreshCatalogInBackground(
		mediaId,
		facts.idAniList,
	);
}

async function refreshCatalogInBackground(mediaId: number, idAniList: number): Promise<void> {
	try {
		const refreshedMedia = await MediaProviderRegistry.getAniListMediaProvider().getMediaById(
			idAniList,
			"background",
			{
				mediaId,
				idAniList,
				source:   "media-inspection-ad-hoc-refresh",
				recovery: "opportunistic inspection refresh logs and drops the failed attempt",
			},
		);
		ingestAnimeDbMedia(
			refreshedMedia,
			{ source: "media-inspection-refresh" },
		);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"media-inspection-refresh.catalog-background",
			typeSafeError(error),
			{ mediaId },
		);
	} finally {
		inFlightCatalogRefreshMediaIds.delete(mediaId);
	}
}

export class MediaInspectionRefreshService {
	// Inspection-triggered refreshes are opportunistic and silent. They improve the
	// page after navigation without blocking the IPC read or showing automatic toast noise.
	public static scheduleForInspection(mediaId: number): void {
		try {
			const now   = Date.now();
			const facts = getSchedulableInspectionFacts(
				mediaId,
				now,
			);
			if (!facts) {
				return;
			}

			const decision = resolveDecision(
				facts,
				now,
			);
			if (!hasRefreshWork(decision)) {
				return;
			}

			markInspectionRefreshScheduled(
				mediaId,
				now,
			);
			scheduleEpisodeHydrationIfNeeded(
				mediaId,
				decision,
			);
			scheduleCatalogRefreshIfNeeded(
				mediaId,
				facts,
				decision,
			);
		} catch (error) {
			LoggerUtils.logMainServiceError(
				"media-inspection-refresh.schedule",
				typeSafeError(error),
				{ mediaId },
			);
		}
	}
}
