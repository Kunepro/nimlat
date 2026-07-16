import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import type { Observable } from "rxjs";
import {
	filter,
	merge,
	share,
	Subject,
} from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

// Renderer config status caching lives outside the facade so the facade remains
// a discoverable control panel while this service owns subscription fan-out and
// read-through cache behavior.
class UserConfigStatusServiceImpl {
	private devModeStatusPromise: Promise<boolean> | null           = null;
	private adminModeStatusPromise: Promise<boolean> | null         = null;
	private canvasDiagnosticsStatus: boolean | null                 = null;
	private canvasDiagnosticsStatusPromise: Promise<boolean> | null = null;
	private readonly adultContentStatusChanges$                     = createSharedPreloadEventStream<boolean>(
		(listener) => window.electronAPI.userConfig.onAdultContentStatusChanged(listener),
	);
	private readonly backgroundStyleChanges$                        = createSharedPreloadEventStream<BackgroundStyle>(
		(listener) => window.electronAPI.userConfig.onBackgroundStyleChanged(listener),
	);
	private readonly preferredTitleLanguageChanges$                 = createSharedPreloadEventStream<PreferredTitleLanguage>(
		(listener) => window.electronAPI.userConfig.onPreferredTitleLanguageChanged(listener),
	);
	private readonly localCanvasDiagnosticsChanges$                 = new Subject<boolean>();
	private readonly preloadCanvasDiagnosticsChanges$               = createSharedPreloadEventStream<boolean>(
		(listener) => window.electronAPI.userConfig.onCanvasDiagnosticsStatusChanged(listener),
	).pipe(
		// Dedupe before the final fan-out so every consumer sees the same accepted value.
		filter((enabled) => this.updateCanvasDiagnosticsStatus(enabled)),
		share(),
	);

	public getDevModeStatus(): Promise<boolean> {
		// Dev mode is DB-owned and read-only from the app UI, so one renderer-side read is enough.
		this.devModeStatusPromise ??= window.electronAPI.userConfig.getDevModeStatus();
		return this.devModeStatusPromise;
	}

	public getAdminModeStatus(): Promise<boolean> {
		// Admin mode is DB-owned and read-only from the app UI, matching dev mode.
		this.adminModeStatusPromise ??= window.electronAPI.userConfig.getAdminModeStatus();
		return this.adminModeStatusPromise;
	}

	public getCanvasDiagnosticsStatus(): Promise<boolean> {
		if (this.canvasDiagnosticsStatus !== null) {
			return Promise.resolve(this.canvasDiagnosticsStatus);
		}

		this.canvasDiagnosticsStatusPromise ??= window.electronAPI.userConfig.getCanvasDiagnosticsStatus()
			.then((enabled) => {
				this.canvasDiagnosticsStatus = enabled;
				return enabled;
			})
			.finally(() => {
				this.canvasDiagnosticsStatusPromise = null;
			});

		return this.canvasDiagnosticsStatusPromise;
	}

	public setCanvasDiagnosticsStatus(enabled: boolean): Promise<void> {
		return window.electronAPI.userConfig.setCanvasDiagnosticsStatus(enabled)
			.then(() => {
				if (this.updateCanvasDiagnosticsStatus(enabled)) {
					this.localCanvasDiagnosticsChanges$.next(enabled);
				}
			});
	}

	public canvasDiagnosticsStatusChanges(): Observable<boolean> {
		// Renderer consumers subscribe to an Observable even though the preload
		// bridge itself is callback-shaped at the Electron boundary.
		return merge(
			this.preloadCanvasDiagnosticsChanges$,
			this.localCanvasDiagnosticsChanges$,
		);
	}

	public adultContentStatusChanges(): Observable<boolean> {
		return this.adultContentStatusChanges$;
	}

	public backgroundStyleChanges(): Observable<BackgroundStyle> {
		return this.backgroundStyleChanges$;
	}

	public preferredTitleLanguageChanges(): Observable<PreferredTitleLanguage> {
		return this.preferredTitleLanguageChanges$;
	}

	private updateCanvasDiagnosticsStatus(enabled: boolean): boolean {
		if (this.canvasDiagnosticsStatus === enabled) {
			return false;
		}

		this.canvasDiagnosticsStatus = enabled;
		return true;
	}
}

export const UserConfigStatusService = new UserConfigStatusServiceImpl();
