import type { ElectronAPI } from "@nimlat/types/electron-api";

type ExternalNavigationApi = ElectronAPI["externalNavigation"];

export class ExternalNavigationFacade {
	public static openExternalUrl(...args: Parameters<ExternalNavigationApi["openExternalUrl"]>): ReturnType<ExternalNavigationApi["openExternalUrl"]> {
		return window.electronAPI.externalNavigation.openExternalUrl(...args);
	}
}
