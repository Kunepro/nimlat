import type {
	AnimeDbDownloadActionResult,
	AnimeDbDownloadProgressData,
	AnimeDbDownloadReleaseStatus,
	AnimeDbPopulationActionResult,
	AnimeDbStartupReadiness,
	AnimeDbUpdateActionResult,
	AnimeDbUpdateProgressData,
	PopulateAnimeDbProgressData,
} from "./ipc-anime-db-payloads";

// Renderer-facing AnimeDB lifecycle APIs. These cover long-running catalog
// population/update/download workflows and must stay progress-event oriented.
export interface AnimeDbPopulationElectronApi {
	start(startPage?: number): Promise<AnimeDbPopulationActionResult>;

	getStatus(): Promise<PopulateAnimeDbProgressData>;

	stop(): Promise<AnimeDbPopulationActionResult>;

	restart(): Promise<AnimeDbPopulationActionResult>;

	onPopulateAnimeDbProgress(callback: (data: PopulateAnimeDbProgressData) => void): () => void;
}

export interface AnimeDbStartupElectronApi {
	getReadiness(): Promise<AnimeDbStartupReadiness>;
}

export interface AnimeDbDownloadElectronApi {
	start(): Promise<AnimeDbDownloadActionResult>;

	getStatus(): Promise<AnimeDbDownloadProgressData>;

	getReleaseStatus(): Promise<AnimeDbDownloadReleaseStatus>;

	cancel(): Promise<AnimeDbDownloadActionResult>;

	onAnimeDbDownloadProgress(callback: (data: AnimeDbDownloadProgressData) => void): () => void;
}

export interface AnimeDbUpdateElectronApi {
	start(): Promise<AnimeDbUpdateActionResult>;

	getStatus(): Promise<AnimeDbUpdateProgressData>;

	stop(): Promise<AnimeDbUpdateActionResult>;

	onAnimeDbUpdateProgress(callback: (data: AnimeDbUpdateProgressData) => void): () => void;
}
