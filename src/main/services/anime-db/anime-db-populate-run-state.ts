import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	type AnimeDbPopulateCursorState,
	applyPersistedCursorToProgress,
	createIdlePopulateProgress,
	createRunningPopulateProgress,
	resolvePopulateTotalMediaLowerBound,
} from "./populate-anime-db-policy";

export interface AnimeDbPopulateMediaProgressInput {
	persistedMediaId?: number;
	wasAlreadyCounted: boolean;
	highestProcessedInBatch: number;
}

type AutoRetryProgressPatch = Partial<Pick<
	PopulateAnimeDbProgressData,
	| "currentStatus"
	| "errorMessage"
	| "autoRetryAttempt"
	| "autoRetryMaxAttempts"
	| "nextRetryAt"
	| "currentPage"
	| "lastProcessedId"
>>;

// Owns the in-memory cursor/progress model for one full AnimeDB population run.
// Persistence and BUS delivery stay outside so tests can isolate state policy from IO side effects.
export class AnimeDbPopulateRunState {
	private cursor: AnimeDbPopulateCursorState;
	private currentProgress: PopulateAnimeDbProgressData = createIdlePopulateProgress();

	public constructor(initialCursor: AnimeDbPopulateCursorState) {
		this.cursor = { ...initialCursor };
		this.syncProgressFromPersistedCursor();
	}

	public getProgress(): PopulateAnimeDbProgressData {
		return { ...this.currentProgress };
	}

	public getCursorState(): AnimeDbPopulateCursorState {
		return { ...this.cursor };
	}

	public loadPersistedCursor(cursor: AnimeDbPopulateCursorState): void {
		this.cursor = { ...cursor };
		this.syncProgressFromPersistedCursor();
	}

	public applyCursorState(cursor: AnimeDbPopulateCursorState): void {
		this.cursor = { ...cursor };
	}

	public resetToIdle(): void {
		this.currentProgress = createIdlePopulateProgress();
	}

	public resetForRunning(): void {
		this.currentProgress = createRunningPopulateProgress(this.cursor);
	}

	public seedLegacyStartPage(startPage: number, persistedMediaCount: number): void {
		this.cursor = {
			persistedCompletedPage: startPage - 1,
			persistedLastMediaId:   0,
			persistedMediaCount,
		};
	}

	public commitCompletedBatch(currentPage: number, requestCount: number, batchMaxId: number): void {
		// The durable ID cursor advances only after the entire ID window commits.
		this.cursor.persistedCompletedPage   = currentPage;
		this.cursor.persistedLastMediaId     = Math.max(
			this.cursor.persistedLastMediaId,
			batchMaxId,
		);
		this.currentProgress.lastProcessedId = this.cursor.persistedLastMediaId || undefined;
		this.currentProgress.requestBatch    = requestCount;
	}

	public applyMediaPersisted(event: AnimeDbPopulateMediaProgressInput): boolean {
		if (!event.wasAlreadyCounted && typeof event.persistedMediaId === "number") {
			this.currentProgress.processedMedias++;
			this.refreshTotalMediaLowerBound();
		}
		this.currentProgress.lastProcessedId = event.highestProcessedInBatch || undefined;

		return this.currentProgress.processedMedias % 5 === 0;
	}

	public updateBatchProgress(
		currentPage: number,
		requestBatch: number,
		totalMedias: number | null,
	): void {
		// Saved-title progress is row-count based; AniList ID-window positions must not become the denominator.
		this.currentProgress.currentPage  = currentPage;
		this.currentProgress.requestBatch = requestBatch;
		this.currentProgress.totalPages   = null;
		this.refreshTotalMediaLowerBound(totalMedias);
		this.currentProgress.totalMediasIsLowerBound = true;
		this.currentProgress.lastProcessedId         = this.cursor.persistedLastMediaId || undefined;
	}

	public markPaused(): void {
		this.currentProgress.currentStatus = "paused";
		this.clearAutoRetryProgress();
	}

	public markAttemptRunning(): void {
		this.currentProgress.currentStatus = "running";
		this.currentProgress.errorMessage  = undefined;
		this.clearAutoRetryProgress();
	}

	public markCompleted(): void {
		this.clearAutoRetryProgress();
		this.currentProgress.currentStatus           = "completed";
		this.currentProgress.totalMediasIsLowerBound = false;
		this.currentProgress.lastProcessedId         = this.cursor.persistedLastMediaId || undefined;
	}

	public markError(errorMessage: string): void {
		this.currentProgress.currentStatus = "error";
		this.currentProgress.errorMessage  = errorMessage;
	}

	public applyRetryProgressPatch(progressPatch: AutoRetryProgressPatch): void {
		this.currentProgress = {
			...this.currentProgress,
			...progressPatch,
		};
	}

	public clearAutoRetryProgress(): void {
		this.currentProgress.autoRetryAttempt     = undefined;
		this.currentProgress.autoRetryMaxAttempts = undefined;
		this.currentProgress.nextRetryAt          = undefined;
	}

	public getNextRetryAt(): number | undefined {
		return this.currentProgress.nextRetryAt;
	}

	private syncProgressFromPersistedCursor(): void {
		this.currentProgress = applyPersistedCursorToProgress(
			this.currentProgress,
			this.cursor,
		);
	}

	private refreshTotalMediaLowerBound(providerTotal?: number | null): void {
		const reportedTotal              = providerTotal ?? this.currentProgress.totalMedias;
		this.currentProgress.totalMedias = resolvePopulateTotalMediaLowerBound(
			reportedTotal,
			this.currentProgress.processedMedias,
		);
	}
}
