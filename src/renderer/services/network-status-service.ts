import type {
	Observable,
	Subscription,
} from "rxjs";
import {
	BehaviorSubject,
	distinctUntilChanged,
	fromEvent,
	mapTo,
	merge,
} from "rxjs";

function readNavigatorOnlineStatus(): boolean {
	return typeof navigator === "undefined"
		? true
		: navigator.onLine;
}

class NetworkStatusService {
	private static instance: NetworkStatusService;
	private readonly status$                               = new BehaviorSubject<boolean>(readNavigatorOnlineStatus());
	private browserEventsSubscription: Subscription | null = null;

	private constructor() {}

	public static getInstance(): NetworkStatusService {
		if (!NetworkStatusService.instance) {
			NetworkStatusService.instance = new NetworkStatusService();
		}
		return NetworkStatusService.instance;
	}

	public start(): void {
		if (this.browserEventsSubscription) {
			return;
		}

		this.publishStatus(
			readNavigatorOnlineStatus(),
			true,
		);
		this.browserEventsSubscription = merge(
			fromEvent(
				window,
				"online",
			).pipe(mapTo(true)),
			fromEvent(
				window,
				"offline",
			).pipe(mapTo(false)),
		)
			.pipe(distinctUntilChanged())
			.subscribe((isOnline) => {
				this.publishStatus(
					isOnline,
					false,
				);
			});
	}

	public stop(): void {
		this.browserEventsSubscription?.unsubscribe();
		this.browserEventsSubscription = null;
	}

	public statusChanges(): Observable<boolean> {
		// React hooks adapt this stream to useSyncExternalStore locally. Keeping
		// the service Observable-first avoids reintroducing callback contracts in
		// renderer domain services.
		return this.status$.pipe(distinctUntilChanged());
	}

	public getSnapshot(): boolean {
		return this.status$.getValue();
	}

	private sendStatusToMain(isOnline: boolean): void {
		window.electronAPI.network.sendConnectivityStatus(isOnline);
	}

	private publishStatus(isOnline: boolean, forceMainNotification: boolean): void {
		const changed = this.status$.getValue() !== isOnline;
		if (changed) {
			this.status$.next(isOnline);
		}

		if (changed || forceMainNotification) {
			this.sendStatusToMain(isOnline);
		}
	}
}

export const networkStatusService = NetworkStatusService.getInstance();
