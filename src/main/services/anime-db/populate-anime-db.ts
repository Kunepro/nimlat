// Services host business logic and long-running workflows used by IPC/daemons.
import { BUS_PopulateAnimeDbProgress } from "@nimlat/busses/main";
import { FullScanAnimeDbVersion } from "@nimlat/constants/config-db";
import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	concatMap,
	defaultIfEmpty,
	EMPTY,
	endWith,
	lastValueFrom,
	tap,
} from "rxjs";
import { createAnimeDbPopulateAutoRetryPlan } from "./anime-db-populate-auto-retry";
import { streamAnimeDbPopulateBatch } from "./anime-db-populate-batch-processor";
import {
	applyAnimeDbPopulateBatchEvent,
	createAnimeDbPopulateBatchResult,
	shouldCommitAnimeDbPopulateBatch,
} from "./anime-db-populate-batch-result";
import {
	clearAnimeDbScanCheckpointSafely,
	createEmptyPopulateCursorState,
	loadAnimeDbPopulateCursorStateSafely,
	loadPersistedAnimeDbMediaCountSafely,
	saveAnimeDbScanCheckpointSafely,
} from "./anime-db-populate-checkpoint-store";
import { NonRetriableAnimeDbPopulateError } from "./anime-db-populate-errors";
import { AnimeDbPopulateRunState } from "./anime-db-populate-run-state";
import {
	type AnimeDbPopulateScanBatchEvent,
	streamAnimeDbPopulateScan,
} from "./anime-db-populate-scan-runner";
import { ANIME_DB_POPULATE_PAGE_SIZE } from "./populate-anime-db-policy";
import { RetryDelayController } from "./retry-delay-controller";

interface AnimeDbPopulateTerminalError {
	error: Error;
	logContext?: Record<string, unknown>;
}

// Full-catalog AniList-to-AnimeDB population coordinator.
//
// Non-obvious state split:
// - `persistedLastMediaId` is the durable fetch cursor and advances only after a
//   complete ID window, including canonical writes and hydration-queue inserts.
// - `persistedCompletedPage` is display/legacy metadata; AniList requests must
//   never reuse it as a deep offset page.
// - pause/crash may replay a partial window, so media writes and secondary queue
//   inserts must remain idempotent.
//
// Targeted refreshes and the incremental updater own separate cursor policies;
// they must not mutate this full-scan checkpoint or treat its final window as an
// append cursor.
export class AnimeDbPopulator {
	private static instance: AnimeDbPopulator | null = null;
	private isRunning                                = false;
	private shouldStop                               = false;
	private runPromise: Promise<void> | null         = null;
	private readonly retryDelayController              = new RetryDelayController();
	private readonly runState                          = new AnimeDbPopulateRunState(createEmptyPopulateCursorState());
	private runAbortController: AbortController | null = null;
	private autoRetryAttempt                         = 0;
	private readonly perPage                           = ANIME_DB_POPULATE_PAGE_SIZE;

	private constructor() {
		this.loadScanCheckpoint();
	}

	// Singleton keeps one scan coordinator in the main process so pause/resume state cannot diverge across IPC calls.
	public static getInstance(): AnimeDbPopulator {
		if (!AnimeDbPopulator.instance) {
			AnimeDbPopulator.instance = new AnimeDbPopulator();
		}
		return AnimeDbPopulator.instance;
	}

	// Return a copy so renderer/preload callers cannot mutate in-memory scan state by reference.
	public getProgress(): PopulateAnimeDbProgressData {
		return this.runState.getProgress();
	}

	// `startPage` is a compatibility input for older IPC callers: values <= 1
	// restart, while larger values seed legacy progress metadata. New resume logic
	// must use the persisted media-ID cursor instead.
	public async start(startPage?: number): Promise<void> {
		this.assertCanStart();
		this.isRunning  = true;
		this.shouldStop = false;
		this.runAbortController = new AbortController();

		this.applyStartCursorStrategy(startPage);
		this.resetProgressForRunningState();
		this.launchPopulationRun();
	}

	// Stop is cooperative: we only pause at safe checkpoints so persisted page state remains resumable.
	public stop(): Promise<void> {
		if (!this.isRunning) {
			return Promise.resolve();
		}

		// Mark stop as requested; status flips to "paused" when the loop reaches a safe checkpoint.
		this.shouldStop = true;
		this.runAbortController?.abort();
		this.retryDelayController.cancel();
		return this.runPromise ?? Promise.resolve();
	}

	// Restart clears both persisted checkpoint state and in-memory progress so the next run is a true clean scan.
	public async restart(): Promise<void> {
		if (this.isRunning) {
			await this.stop();
		}

		this.clearScanCheckpoint();
		this.runState.applyCursorState(createEmptyPopulateCursorState());
		this.autoRetryAttempt = 0;
		this.runState.resetToIdle();

		return this.start(1);
	}

	// ID-window advancement happens only after the whole batch is written, which keeps resume conservative and replay-safe.
	private async populateDatabase(): Promise<void> {
		const stopped = await this.consumePopulateScanEvents();
		if (stopped) {
			return;
		}

		try {
			this.markFullScanBaselineWhenMissing();
		} catch (error) {
			throw new NonRetriableAnimeDbPopulateError(
				"Failed to mark the local anime database population as completed.",
				typeSafeError(error),
			);
		}
		this.runState.markCompleted();
		this.broadcastProgress();
		this.saveScanCheckpoint();
	}

	// The config value identifies the installed release baseline. A scan may add
	// fresher catalog data, but must not erase which downloadable release was
	// installed; scan freshness is tracked separately by the AnimeDB checkpoint.
	private markFullScanBaselineWhenMissing(): void {
		if (!UserDbFacade.config.getAnimeDbVersion()) {
			UserDbFacade.config.setAnimeDbVersion(FullScanAnimeDbVersion);
		}
	}

	private async consumePopulateScanEvents(): Promise<boolean> {
		let stopped = false;

		await lastValueFrom(streamAnimeDbPopulateScan({
			startAfterMediaId: this.runState.getCursorState().persistedLastMediaId,
			includeAdult:      true,
			perPage:           this.perPage,
			signal:            this.runAbortController?.signal,
		}).pipe(
			concatMap((event) => {
				if (stopped) {
					return EMPTY;
				}

				if (event.kind === "stopped") {
					stopped = true;
					this.pauseIfRequested();
					return EMPTY;
				}

				if (this.pauseIfRequested()) {
					stopped = true;
					return EMPTY;
				}

				this.updateBatchProgress(
					event.currentPage,
					event.requestCount,
					event.totalMedias,
				);

				return this.processScannedBatchEvents(event).pipe(
					tap((batchStopped) => {
						if (batchStopped) {
							stopped = true;
						}
					}),
				);
			}),
			defaultIfEmpty(null),
		));

		return stopped || this.pauseIfRequested();
	}

	private commitCompletedBatch(currentPage: number, requestCount: number, batchMaxId: number): void {
		this.runState.commitCompletedBatch(
			currentPage,
			requestCount,
			batchMaxId,
		);
		this.saveScanCheckpoint();
	}

	// Per-media UI progress is allowed, but the persisted ID cursor stays atomic at the batch boundary.
	// If the process stops mid-batch, the next run replays that batch from the previous committed ID.
	private processScannedBatchEvents(scanEvent: AnimeDbPopulateScanBatchEvent) {
		let batchResult = createAnimeDbPopulateBatchResult();

		return streamAnimeDbPopulateBatch({
			medias:               scanEvent.batch.medias,
			committedLastMediaId: this.runState.getCursorState().persistedLastMediaId,
			signal:               this.runAbortController?.signal,
		}).pipe(
			tap((event) => {
				batchResult = applyAnimeDbPopulateBatchEvent(
					batchResult,
					event,
				);
				if (event.kind === "stopped") {
					this.pauseIfRequested();
					return;
				}

				if (this.runState.applyMediaPersisted(event)) {
					this.broadcastProgress();
				}
			}),
			endWith("batchCompleted" as const),
			concatMap((event) => {
				if (event === "batchCompleted") {
					if (shouldCommitAnimeDbPopulateBatch(batchResult)) {
						this.commitCompletedBatch(
							scanEvent.currentPage,
							scanEvent.requestCount,
							scanEvent.batchMaxId,
						);
					}
					return [ batchResult.stopped ];
				}

				return EMPTY;
			}),
		);
	}

	private updateBatchProgress(
		currentPage: number,
		requestBatch: number,
		totalMedias: number | null,
	): void {
		this.runState.updateBatchProgress(
			currentPage,
			requestBatch,
			totalMedias,
		);
		this.broadcastProgress();
	}

	private pauseIfRequested(): boolean {
		if (!this.shouldStop) {
			return false;
		}

		this.runState.markPaused();
		// Save only the last fully completed page. A partial current page remains deliberately unacknowledged.
		this.saveScanCheckpoint();
		this.broadcastProgress();
		return true;
	}

	private assertCanStart(): void {
		if (this.isRunning) {
			throw new Error("Database population is already running");
		}
	}

	private applyStartCursorStrategy(startPage?: number): void {
		if (startPage === undefined) {
			this.loadScanCheckpoint();
			return;
		}

		if (startPage <= 1) {
			this.clearScanCheckpoint();
			this.runState.applyCursorState(createEmptyPopulateCursorState());
			return;
		}

		this.runState.seedLegacyStartPage(
			startPage,
			this.loadPersistedMediaCount(),
		);
	}

	private resetProgressForRunningState(): void {
		this.autoRetryAttempt = 0;
		this.runState.resetForRunning();
		this.broadcastProgress();
	}

	private launchPopulationRun(): void {
		// The catch path owns the terminal error state so callers only need to react to progress events.
		this.runPromise = this.runPopulationWithAutoRetry()
			.catch(error => {
				const terminalError = this.resolveTerminalError(error);
				LoggerUtils.logMainServiceError(
					"anime-db.populate.start",
					terminalError.error,
					terminalError.logContext,
				);
				this.runState.markError(terminalError.error.message);
				this.broadcastProgress();
				this.saveScanCheckpoint();
			})
			.finally(() => {
				this.isRunning          = false;
				this.runPromise         = null;
				this.runAbortController = null;
				this.retryDelayController.cancel();
			});
	}

	private async runPopulationWithAutoRetry(): Promise<void> {
		while (true) {
			if (this.pauseIfRequested()) {
				return;
			}

			this.markPopulationAttemptRunning();

			try {
				await this.populateDatabase();
				this.autoRetryAttempt = 0;
				this.clearAutoRetryProgress();
				return;
			} catch (error) {
				const safeError = typeSafeError(error);
				if (this.shouldStop) {
					this.pauseIfRequested();
					return;
				}

				if (safeError instanceof NonRetriableAnimeDbPopulateError) {
					throw safeError;
				}

				if (!this.scheduleAutoRetry(safeError)) {
					throw safeError;
				}

				await this.waitForAutoRetryDelay();
			}
		}
	}

	private markPopulationAttemptRunning(): void {
		this.runState.markAttemptRunning();
		this.broadcastProgress();
	}

	private scheduleAutoRetry(error: Error): boolean {
		const retryPlan = createAnimeDbPopulateAutoRetryPlan({
			currentAttempt: this.autoRetryAttempt,
			error,
			cursor:         this.runState.getCursorState(),
			now:            Date.now(),
		});
		if (!retryPlan) {
			return false;
		}

		this.autoRetryAttempt = retryPlan.attempt;

		LoggerUtils.logMainServiceError(
			"anime-db.populate.auto-retry",
			error,
			retryPlan.logContext,
		);

		this.runState.applyRetryProgressPatch(retryPlan.progressPatch);
		this.saveScanCheckpoint();
		this.broadcastProgress();
		return true;
	}

	private waitForAutoRetryDelay(): Promise<void> {
		const nextRetryAt = this.runState.getNextRetryAt();
		return this.retryDelayController.waitUntil(nextRetryAt ?? Date.now());
	}

	private clearAutoRetryProgress(): void {
		this.runState.clearAutoRetryProgress();
	}

	private resolveTerminalError(error: unknown): AnimeDbPopulateTerminalError {
		const safeError = typeSafeError(error);
		if (safeError instanceof NonRetriableAnimeDbPopulateError) {
			return {
				error:      safeError.originalError,
				logContext: safeError.logContext,
			};
		}

		return { error: safeError };
	}

	private saveScanCheckpoint(): void {
		saveAnimeDbScanCheckpointSafely(this.runState.getCursorState());
	}

	private loadScanCheckpoint(): void {
		this.runState.loadPersistedCursor(loadAnimeDbPopulateCursorStateSafely());
	}

	private loadPersistedMediaCount(): number {
		return loadPersistedAnimeDbMediaCountSafely();
	}

	private clearScanCheckpoint(): void {
		clearAnimeDbScanCheckpointSafely();
	}

	private broadcastProgress(): void {
		// Renderer progress is observational only; the IPC bridge owns window delivery.
		BUS_PopulateAnimeDbProgress.next(this.getProgress());
	}
}
