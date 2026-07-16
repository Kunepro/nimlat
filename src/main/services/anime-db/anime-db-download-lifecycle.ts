export type AnimeDbDownloadLifecycleStartResult =
	| { accepted: true }
	| { accepted: false; error: string };

type AnimeDbDownloadLifecyclePhase = "idle" | "resolving-release" | "running";

const ANIME_DB_DOWNLOAD_ALREADY_RUNNING_ERROR = "Anime database download is already running";

// Keeps start/resolve/run/cancel rules out of the downloader service. Cancel may
// arrive before the HTTP transfer exists, so the lifecycle records intent as
// well as aborting the active run signal when one is available.
export class AnimeDbDownloadLifecycle {
	private phase: AnimeDbDownloadLifecyclePhase    = "idle";
	private abortController: AbortController | null = null;
	private cancellationRequested                   = false;

	public beginStartRequest(): AnimeDbDownloadLifecycleStartResult {
		if (this.phase !== "idle") {
			return {
				accepted: false,
				error:    ANIME_DB_DOWNLOAD_ALREADY_RUNNING_ERROR,
			};
		}

		this.phase                 = "resolving-release";
		this.cancellationRequested = false;
		return { accepted: true };
	}

	public beginRun(): AbortController | null {
		if (this.phase !== "resolving-release" || this.cancellationRequested) {
			return null;
		}

		this.abortController = new AbortController();
		this.phase           = "running";
		return this.abortController;
	}

	public requestCancel(): boolean {
		if (this.phase === "idle") {
			return false;
		}

		this.cancellationRequested = true;
		this.abortController?.abort();
		return true;
	}

	public isCancellationRequested(): boolean {
		return this.cancellationRequested;
	}

	public finish(): void {
		this.phase                 = "idle";
		this.abortController       = null;
		this.cancellationRequested = false;
	}
}
