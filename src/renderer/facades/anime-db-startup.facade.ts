import type { ElectronAPI } from "@nimlat/types/electron-api";

type AnimeDbStartupApi = ElectronAPI["animeDbStartup"];

export class AnimeDbStartupFacade {
	public static getReadiness(...args: Parameters<AnimeDbStartupApi["getReadiness"]>): ReturnType<AnimeDbStartupApi["getReadiness"]> {
		return window.electronAPI.animeDbStartup.getReadiness(...args);
	}
}
