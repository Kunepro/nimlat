import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { GroupExplorerElectronApi } from "@nimlat/types/electron-api";
import { ipcRenderer } from "electron";

type GroupExplorerEventsPreloadApi = Pick<
	GroupExplorerElectronApi,
	| "onGroupListChanged"
	| "onGroupMediaItemsPatched"
	| "onGroupMediaListChanged"
	| "onMediaEpisodesItemsPatched"
	| "onMediaEpisodesListChanged"
>;

function subscribeToGroupExplorerEvent<TEvent>(
	channel: string,
	callback: (event: TEvent) => void,
): () => void {
	const listener = (_: unknown, event: TEvent) => callback(event);
	ipcRenderer.on(
		channel,
		listener,
	);
	return () => {
		ipcRenderer.removeListener(
			channel,
			listener,
		);
	};
}

// Callback listeners stay in preload; renderer services convert them to Observable streams.
export const groupExplorerEventsPreloadApi: GroupExplorerEventsPreloadApi = {
	onGroupListChanged:          (callback) => subscribeToGroupExplorerEvent(
		IpcChannels.GroupListChanged,
		callback,
	),
	onGroupMediaListChanged:     (callback) => subscribeToGroupExplorerEvent(
		IpcChannels.GroupMediaListChanged,
		callback,
	),
	onGroupMediaItemsPatched:    (callback) => subscribeToGroupExplorerEvent(
		IpcChannels.GroupMediaItemsPatched,
		callback,
	),
	onMediaEpisodesListChanged:  (callback) => subscribeToGroupExplorerEvent(
		IpcChannels.MediaEpisodesListChanged,
		callback,
	),
	onMediaEpisodesItemsPatched: (callback) => subscribeToGroupExplorerEvent(
		IpcChannels.MediaEpisodesItemsPatched,
		callback,
	),
};
