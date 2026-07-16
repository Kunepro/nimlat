import { DaemonManager } from "./media-hydrator/daemon-manager";
import { ReleaseWatchDaemon } from "./release-watch-daemon";

let daemonManager: DaemonManager | null = null;
let releaseWatchDaemon: ReleaseWatchDaemon | null = null;

// Start daemon consumers exactly once. The handles are retained so dev-rebuild
// shutdown can clear timers before SQLite is closed.
export function initDaemons(): void {
	if (daemonManager || releaseWatchDaemon) {
		return;
	}

	daemonManager = new DaemonManager();
	releaseWatchDaemon = new ReleaseWatchDaemon();
}

export function disposeDaemons(): void {
	daemonManager?.dispose();
	releaseWatchDaemon?.dispose();
	daemonManager = null;
	releaseWatchDaemon = null;
}
