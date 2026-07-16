import type {
	AnimeDbDownloadElectronApi,
	AnimeDbPopulationElectronApi,
	AnimeDbStartupElectronApi,
	AnimeDbUpdateElectronApi,
} from "./electron-api-anime-db";
import type { DownloadSearchElectronApi } from "./electron-api-download-search";
import type { ExternalTrackingElectronApi } from "./electron-api-external-tracking";
import type { GroupAssignmentsElectronApi } from "./electron-api-group-assignments";
import type { GroupExplorerElectronApi } from "./electron-api-group-explorer";
import type { HydratorElectronApi } from "./electron-api-hydrator";
import type { ReleaseWatchElectronApi } from "./electron-api-release-watch";
import type {
	AniListQueueElectronApi,
	AppUpdateElectronApi,
	ExternalNavigationElectronApi,
	NetworkElectronApi,
	RendererImagesElectronApi,
	ToasterElectronApi,
} from "./electron-api-system";
import type { UserConfigElectronApi } from "./electron-api-user-config";

export type {
	AnimeDbDownloadElectronApi,
	AnimeDbPopulationElectronApi,
	AnimeDbStartupElectronApi,
	AnimeDbUpdateElectronApi,
} from "./electron-api-anime-db";
export type { DownloadSearchElectronApi } from "./electron-api-download-search";
export type { ExternalTrackingElectronApi } from "./electron-api-external-tracking";
export type { GroupAssignmentsElectronApi } from "./electron-api-group-assignments";
export type { GroupExplorerElectronApi } from "./electron-api-group-explorer";
export type { HydratorElectronApi } from "./electron-api-hydrator";
export type { ReleaseWatchElectronApi } from "./electron-api-release-watch";
export type {
	AniListQueueElectronApi,
	AppUpdateElectronApi,
	ExternalNavigationElectronApi,
	NetworkElectronApi,
	OpenExternalUrlResult,
	RendererImagesElectronApi,
	ToasterElectronApi,
} from "./electron-api-system";
export type { UserConfigElectronApi } from "./electron-api-user-config";

// Renderer-facing API contract exposed by preload (`window.electronAPI`).
// Keep this file as the stable public assembly point; domain-specific files own
// the actual callable method groups so preload surfaces can evolve independently.
export interface ElectronAPI {
	aniListQueue: AniListQueueElectronApi;
	releaseWatch: ReleaseWatchElectronApi;
	downloadSearch: DownloadSearchElectronApi;
	externalTracking: ExternalTrackingElectronApi;
	hydrator: HydratorElectronApi;
	groupExplorer: GroupExplorerElectronApi;
	groupAssignments: GroupAssignmentsElectronApi;
	userConfig: UserConfigElectronApi;
	rendererImages: RendererImagesElectronApi;
	externalNavigation: ExternalNavigationElectronApi;
	network: NetworkElectronApi;
	animeDbPopulation: AnimeDbPopulationElectronApi;
	animeDbStartup: AnimeDbStartupElectronApi;
	animeDbDownload: AnimeDbDownloadElectronApi;
	animeDbUpdate: AnimeDbUpdateElectronApi;
	appUpdate: AppUpdateElectronApi;
	toaster: ToasterElectronApi;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
