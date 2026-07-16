import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import {
	AnimeDbDownloadFacade,
	AnimeDbStartupFacade,
	UserConfigFacade,
} from "../../facades";

// Keeps first-run AnimeDB download IPC calls outside the setup hook. The hook
// owns mounted-state guards and navigation; this runner owns preload/facade calls.
export function loadAnimeDbDownloadDevModeStatus() {
	return UserConfigFacade.getDevModeStatus();
}

export function loadAnimeDbStartupReadiness() {
	return AnimeDbStartupFacade.getReadiness();
}

export function loadAnimeDbDownloadStatus() {
	return AnimeDbDownloadFacade.getStatus();
}

export function subscribeToAnimeDbDownloadProgressChanges(
	onProgress: (progress: AnimeDbDownloadProgressData) => void,
) {
	return AnimeDbDownloadFacade.progressChanges().subscribe(onProgress);
}

export function startAnimeDbDownload() {
	return AnimeDbDownloadFacade.start();
}

export function cancelAnimeDbDownload() {
	return AnimeDbDownloadFacade.cancel();
}
