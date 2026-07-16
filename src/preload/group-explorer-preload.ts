import type { GroupExplorerElectronApi } from "@nimlat/types/electron-api";
import { groupExplorerEventsPreloadApi } from "./group-explorer/group-explorer-events-preload";
import { groupExplorerGalleryPreloadApi } from "./group-explorer/group-explorer-gallery-preload";
import { groupExplorerMutationPreloadApi } from "./group-explorer/group-explorer-mutation-preload";
import { groupExplorerReadPreloadApi } from "./group-explorer/group-explorer-read-preload";

// Stable preload assembly for the renderer group-explorer API. Domain bridge
// modules keep IPC channels easy to audit without changing window.electronAPI.
const groupExplorer: GroupExplorerElectronApi = {
	...groupExplorerReadPreloadApi,
	...groupExplorerMutationPreloadApi,
	...groupExplorerGalleryPreloadApi,
	...groupExplorerEventsPreloadApi,
};

export const groupExplorerApi = {
	groupExplorer,
};
