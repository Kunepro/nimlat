import { ElectronAPI } from "@nimlat/types/electron-api";
import { contextBridge } from "electron";
import { aniListQueueApi } from "./ani-list-queue-preload";
import { animeDbDownloadApi } from "./anime-db-download-preload";
import { animeDbPopulateApi } from "./anime-db-populate-preload";
import { animeDbStartupApi } from "./anime-db-startup-readiness-preload";
import { animeDbUpdateApi } from "./anime-db-update-preload";
import { appUpdateApi } from "./app-update-preload";
import { userConfigApi } from "./config-preload";
import { downloadSearchApi } from "./download-search-preload";
import { externalNavigationApi } from "./external-navigation-preload";
import { externalTrackingApi } from "./external-tracking-preload";
import { groupExplorerApi } from "./group-explorer-preload";
import { groupManualAssignmentApi } from "./group-manual-assignment-preload";
import { hydratorApi } from "./hydrator-preload";
import { networkApi } from "./network-preload";
import { releaseWatchApi } from "./release-watch-preload";
import { rendererImagesApi } from "./renderer-image-preload";
import { toasterApi } from "./toaster-preload";

// Assemble the single renderer contract exposed through contextBridge. Domain
// preload modules own channel details; this file only composes their public groups.
const api: ElectronAPI = {
	...aniListQueueApi,
	...hydratorApi,
	...groupExplorerApi,
	...groupManualAssignmentApi,
	...userConfigApi,
	...networkApi,
	...releaseWatchApi,
	...downloadSearchApi,
	...externalNavigationApi,
	...externalTrackingApi,
	...rendererImagesApi,
	...animeDbPopulateApi,
	...animeDbStartupApi,
	...animeDbDownloadApi,
	...animeDbUpdateApi,
	...appUpdateApi,
	...toasterApi,
};

// Expose the narrow contract instead of Electron's ipcRenderer so renderer code
// cannot send arbitrary channels or retain privileged Electron objects.
contextBridge.exposeInMainWorld(
	"electronAPI",
	api,
);
