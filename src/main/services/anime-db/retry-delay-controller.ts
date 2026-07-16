import {
	firstValueFrom,
	map,
	race,
	Subject,
	timer,
} from "rxjs";

// Small cancellable delay primitive for cooperative long-running workflows.
// Cancel resolves the pending wait instead of rejecting so callers can re-check
// their own stop flag and keep shutdown paths simple.
export class RetryDelayController {
	private readonly delayCancelled$ = new Subject<void>();

	public waitUntil(targetTimeMs: number): Promise<void> {
		const delayMs = Math.max(
			0,
			targetTimeMs - Date.now(),
		);

		// Race keeps cancellation as a reactive signal instead of storing Promise
		// resolver callbacks that only represent the latest active wait.
		return firstValueFrom(race(
			timer(delayMs),
			this.delayCancelled$,
		).pipe(map(() => undefined)));
	}

	public cancel(): void {
		this.delayCancelled$.next();
	}
}
