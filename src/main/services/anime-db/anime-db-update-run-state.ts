import type { PageInfo } from "@nimlat/types/ani-list-media-api";
import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	type AnimeDbUpdateCursor,
	createRecentCompletedUpdateProgress,
	createRunningUpdateProgress,
	toStoredProviderUpdatedAt,
	UPDATE_COOLDOWN_MS,
} from "./anime-db-update-policy";
import { applyStoredAnimeDbUpdateStateToIdleProgress } from "./anime-db-update-state-store";

export function createIdleAnimeDbUpdateProgress(): AnimeDbUpdateProgressData {
	return {
		status:                          "idle",
		phase:                           "idle",
		currentPage:                     0,
		processedMedias:                 0,
		totalMedias:                     null,
		totalMediasIsLowerBound:         false,
		cutoffProviderUpdatedAt:         null,
		lastSuccessfulProviderUpdatedAt: null,
	};
}

// Owns transient update progress state. The updater persists cursors and publishes
// BUS events, while this class keeps the snapshot mutation rules small and testable.
export class AnimeDbUpdateRunState {
	private currentProgress: AnimeDbUpdateProgressData = createIdleAnimeDbUpdateProgress();

	public getProgress(): AnimeDbUpdateProgressData {
		return { ...this.currentProgress };
	}

	public restoreIdleFromState(state: AnimeDbUpdateState): void {
		this.currentProgress = applyStoredAnimeDbUpdateStateToIdleProgress(
			createIdleAnimeDbUpdateProgress(),
			state,
		);
	}

	public markRecentCompleted(
		state: AnimeDbUpdateState,
		cooldownEndsAt: number,
	): void {
		this.currentProgress = createRecentCompletedUpdateProgress(
			state,
			cooldownEndsAt,
		);
	}

	public markRunning(
		cursor: AnimeDbUpdateCursor,
		startedAt: number,
	): void {
		this.currentProgress = createRunningUpdateProgress(
			cursor,
			startedAt,
		);
	}

	public markUpdatedAtSweepStarted(
		page: number,
		cutoffProviderUpdatedAt: number,
	): void {
		this.currentProgress = {
			...this.currentProgress,
			phase:                   "updated-at-sweep",
			currentPage:             page,
			cutoffProviderUpdatedAt: toStoredProviderUpdatedAt(cutoffProviderUpdatedAt),
		};
	}

	public markTailSweepStarted(page: number): void {
		this.currentProgress = {
			...this.currentProgress,
			phase:       "tail-sweep",
			currentPage: page,
			totalMedias: null,
		};
	}

	public markPageProgress(
		page: number,
		pageInfo: PageInfo,
	): void {
		this.currentProgress = {
			...this.currentProgress,
			currentPage:             page,
			totalMedias:             pageInfo.total ?? null,
			totalMediasIsLowerBound: pageInfo.hasNextPage,
		};
	}

	public recordMediaIngested(input: {
		mediaId: number;
		providerUpdatedAt: number;
	}): boolean {
		const processedMedias = this.currentProgress.processedMedias + 1;
		this.currentProgress  = {
			...this.currentProgress,
			processedMedias,
			lastProcessedId:                input.mediaId,
			lastProcessedProviderUpdatedAt: input.providerUpdatedAt || undefined,
		};

		return processedMedias % 5 === 0;
	}

	public markPaused(): void {
		this.currentProgress = {
			...this.currentProgress,
			status: "paused",
		};
	}

	public markCompleted(input: {
		completedAt: number;
		lastSuccessfulProviderUpdatedAt: number | null;
	}): void {
		this.currentProgress = {
			...this.currentProgress,
			status:                          "completed",
			phase:                           "completed",
			completedAt:                     input.completedAt,
			lastSuccessfulRunCompletedAt:    input.completedAt,
			cooldownEndsAt:                  input.completedAt + UPDATE_COOLDOWN_MS,
			lastSuccessfulProviderUpdatedAt: input.lastSuccessfulProviderUpdatedAt,
		};
	}

	public markError(errorMessage: string): void {
		this.currentProgress = {
			...this.currentProgress,
			status: "error",
			errorMessage,
		};
	}
}
