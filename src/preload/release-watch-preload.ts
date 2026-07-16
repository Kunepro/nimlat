import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	PastReleaseWatchPage,
	ReleaseWatchListChangedEvent,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchPage,
} from "@nimlat/types/release-watch";
import { ipcRenderer } from "electron";

export const releaseWatchApi = {
	releaseWatch: {
		listPast:              (
														 scope: ReleaseWatchScopeFilter = "tracked",
			                       limit: number                  = 50,
			                       offset: number                 = 0,
													 ): Promise<PastReleaseWatchPage> => ipcRenderer.invoke(
			IpcChannels.ReleaseWatchListPast,
			scope,
			limit,
			offset,
		),
		listUpcoming:          (
														 scope: ReleaseWatchScopeFilter = "tracked",
			                       limit: number                  = 50,
			                       offset: number                 = 0,
													 ): Promise<UpcomingReleaseWatchPage> => ipcRenderer.invoke(
			IpcChannels.ReleaseWatchListUpcoming,
			scope,
			limit,
			offset,
		),
		onPastListChanged:     (callback: (event: ReleaseWatchListChangedEvent) => void): (() => void) => {
			const listener = (_: unknown, event: ReleaseWatchListChangedEvent) => callback(event);
			ipcRenderer.on(
				IpcChannels.ReleaseWatchPastListChanged,
				listener,
			);
			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ReleaseWatchPastListChanged,
					listener,
				);
			};
		},
		onUpcomingListChanged: (callback: (event: ReleaseWatchListChangedEvent) => void): (() => void) => {
			const listener = (_: unknown, event: ReleaseWatchListChangedEvent) => callback(event);
			ipcRenderer.on(
				IpcChannels.ReleaseWatchUpcomingListChanged,
				listener,
			);
			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ReleaseWatchUpcomingListChanged,
					listener,
				);
			};
		},
	},
};
