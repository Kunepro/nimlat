import type { AniListQueueStatus } from "@nimlat/types/ani-list-queue";
import {
	concat,
	distinctUntilChanged,
	interval,
	map,
	Observable,
	of,
	shareReplay,
	startWith,
	switchMap,
	takeWhile,
} from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

const INITIAL_ANI_LIST_QUEUE_STATUS: AniListQueueStatus = {
	isPaused:         false,
	remainingSeconds: 0,
};

function normalizePauseSeconds(seconds: number): number {
	if (!Number.isFinite(seconds)) {
		return 0;
	}

	return Math.max(
		0,
		Math.ceil(seconds),
	);
}

function createStatusFromRemainingSeconds(remainingSeconds: number): AniListQueueStatus {
	return remainingSeconds > 0
		? {
			isPaused: true,
			remainingSeconds,
		}
		: INITIAL_ANI_LIST_QUEUE_STATUS;
}

function createPauseCountdown(seconds: number): Observable<AniListQueueStatus> {
	const initialRemainingSeconds = normalizePauseSeconds(seconds);
	if (initialRemainingSeconds <= 0) {
		return of(INITIAL_ANI_LIST_QUEUE_STATUS);
	}

	return concat(
		of(createStatusFromRemainingSeconds(initialRemainingSeconds)),
		interval(1000).pipe(
			map((elapsedTicks) => initialRemainingSeconds - elapsedTicks - 1),
			map(createStatusFromRemainingSeconds),
			takeWhile(
				(status) => status.isPaused,
				true,
			),
		),
	);
}

function areAniListQueueStatusesEqual(left: AniListQueueStatus, right: AniListQueueStatus): boolean {
	return left.isPaused === right.isPaused
		&& left.remainingSeconds === right.remainingSeconds;
}

// Converts one preload pause event stream into a shared countdown stream so React
// consumers subscribe to state, not to timer orchestration or IPC details.
class AniListQueueStatusServiceImpl {
	private readonly pauseSeconds$ = createSharedPreloadEventStream<number>(
		(listener) => window.electronAPI.aniListQueue.onPaused(listener),
	);

	private readonly status$ = this.pauseSeconds$.pipe(
		switchMap(createPauseCountdown),
		startWith(INITIAL_ANI_LIST_QUEUE_STATUS),
		distinctUntilChanged(areAniListQueueStatusesEqual),
		shareReplay({
			bufferSize: 1,
			refCount:   true,
		}),
	);

	public statusChanges(): Observable<AniListQueueStatus> {
		return this.status$;
	}

	public getInitialStatus(): AniListQueueStatus {
		return INITIAL_ANI_LIST_QUEUE_STATUS;
	}
}

export const AniListQueueStatusService = new AniListQueueStatusServiceImpl();
