import type {
	AniListMedia,
	PageInfo,
} from "@nimlat/types/ani-list-media-api";
import type {
	AnimeDbUpdateBaseline,
	AnimeDbUpdateState,
} from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";

export interface AnimeDbUpdateCursor {
	lastSuccessfulProviderUpdatedAt: number;
	lastKnownTailPage: number;
	lastSuccessfulRunCompletedAt: number | null;
}

export interface ProviderPage {
	pageInfo: PageInfo;
	medias: AniListMedia[];
}

export interface SweepResult {
	maxProviderUpdatedAt: number;
	lastTailPage?: number;
	stopped: boolean;
}

export const UPDATE_STATE_VERSION  = 1;
export const ANILIST_PAGE_SIZE     = 50;
const UPDATE_OVERLAP_SECONDS       = 7 * 24 * 60 * 60;
export const ID_TAIL_OVERLAP_PAGES = 2;
export const UPDATE_COOLDOWN_MS    = 24 * 60 * 60 * 1000;

export function resolveUpdatedAtSweepCutoff(cursor: AnimeDbUpdateCursor): number {
	return Math.max(
		0,
		cursor.lastSuccessfulProviderUpdatedAt - UPDATE_OVERLAP_SECONDS,
	);
}

export function resolveAnimeDbUpdateStartCursor(input: {
	baseline: AnimeDbUpdateBaseline;
	persistedState: AnimeDbUpdateState | null;
}): AnimeDbUpdateCursor {
	const {
					baseline,
					persistedState,
				}                               = input;
	const lastSuccessfulProviderUpdatedAt = Math.max(
		persistedState?.lastSuccessfulProviderUpdatedAt ?? 0,
		baseline.maxProviderUpdatedAt ?? 0,
	);

	return {
		lastSuccessfulProviderUpdatedAt,
		lastKnownTailPage:            persistedState?.lastKnownTailPage
																		?? estimateTailPageFromBaseline(baseline),
		lastSuccessfulRunCompletedAt: persistedState?.lastSuccessfulRunCompletedAt ?? null,
	};
}

export function createRunningUpdateProgress(
	cursor: AnimeDbUpdateCursor,
	startedAt: number,
): AnimeDbUpdateProgressData {
	return {
		status:                          "running",
		phase:                           "updated-at-sweep",
		currentPage:                     1,
		processedMedias:                 0,
		totalMedias:                     null,
		totalMediasIsLowerBound:         false,
		cutoffProviderUpdatedAt:         toStoredProviderUpdatedAt(resolveUpdatedAtSweepCutoff(cursor)),
		lastSuccessfulProviderUpdatedAt: toStoredProviderUpdatedAt(cursor.lastSuccessfulProviderUpdatedAt),
		lastSuccessfulRunCompletedAt:    cursor.lastSuccessfulRunCompletedAt ?? undefined,
		startedAt,
	};
}

export function createRecentCompletedUpdateProgress(
	state: AnimeDbUpdateState,
	cooldownEndsAt: number,
): AnimeDbUpdateProgressData {
	return {
		status:                          "completed",
		phase:                           "completed",
		currentPage:                     0,
		processedMedias:                 0,
		totalMedias:                     null,
		totalMediasIsLowerBound:         false,
		cutoffProviderUpdatedAt:         null,
		lastSuccessfulProviderUpdatedAt: state.lastSuccessfulProviderUpdatedAt,
		lastSuccessfulRunCompletedAt:    state.lastSuccessfulRunCompletedAt ?? undefined,
		cooldownEndsAt,
		completedAt:                     state.lastSuccessfulRunCompletedAt ?? undefined,
	};
}

export function getOldestProviderUpdatedAt(medias: AniListMedia[]): number {
	return medias.reduce(
		(
			oldest,
			media,
		) => Math.min(
			oldest,
			media.updatedAt ?? 0,
		),
		Number.MAX_SAFE_INTEGER,
	);
}

export function toStoredProviderUpdatedAt(value: number): number | null {
	return value > 0 ? value : null;
}

export function resolveCooldownEndsAt(state: AnimeDbUpdateState | null): number | null {
	if (
		state?.lastRunStatus !== "completed"
		|| typeof state.lastSuccessfulRunCompletedAt !== "number"
	) {
		return null;
	}

	return state.lastSuccessfulRunCompletedAt + UPDATE_COOLDOWN_MS;
}

function estimateTailPageFromBaseline(baseline: AnimeDbUpdateBaseline): number {
	// Full population checkpoints count committed ID windows, not AniList offset
	// pages. Only the persisted incremental cursor or actual catalog row count can
	// seed an ID-sorted tail-page request without crossing cursor domains.
	return Math.max(
		1,
		Math.ceil(baseline.mediaCount / ANILIST_PAGE_SIZE),
	);
}
