import type { ElectronAPI } from "@nimlat/types/electron-api";
import { AnimeDbDownloadProgressService } from "../services/anime-db-download-progress-service";

type AnimeDbDownloadApi = ElectronAPI["animeDbDownload"];
type AnimeDbDownloadProgressApi = typeof AnimeDbDownloadProgressService;

export class AnimeDbDownloadFacade {
	public static start(...args: Parameters<AnimeDbDownloadApi["start"]>): ReturnType<AnimeDbDownloadApi["start"]> {
		return window.electronAPI.animeDbDownload.start(...args);
	}

	public static getStatus(...args: Parameters<AnimeDbDownloadApi["getStatus"]>): ReturnType<AnimeDbDownloadApi["getStatus"]> {
		return window.electronAPI.animeDbDownload.getStatus(...args);
	}

	public static getReleaseStatus(...args: Parameters<AnimeDbDownloadApi["getReleaseStatus"]>): ReturnType<AnimeDbDownloadApi["getReleaseStatus"]> {
		return window.electronAPI.animeDbDownload.getReleaseStatus(...args);
	}

	public static cancel(...args: Parameters<AnimeDbDownloadApi["cancel"]>): ReturnType<AnimeDbDownloadApi["cancel"]> {
		return window.electronAPI.animeDbDownload.cancel(...args);
	}

	public static progressChanges(...args: Parameters<AnimeDbDownloadProgressApi["progressChanges"]>): ReturnType<AnimeDbDownloadProgressApi["progressChanges"]> {
		return AnimeDbDownloadProgressService.progressChanges(...args);
	}
}
