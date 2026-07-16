import {
	BUS_MediaEpisodesItemsPatched,
	BUS_MediaEpisodesListChanged,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	bufferTime,
	filter,
	map,
	mergeMap,
	Subscription,
} from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
} from "../main-bus-event-bridge";
import {
	GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS,
	mergeEpisodePatchBurstsByMediaId,
} from "./group-explorer-event-bridge-utils";

export function addGroupExplorerEpisodeEventBridges(subscription: Subscription): void {
	addMediaEpisodesListChangedBridge(subscription);
	addMediaEpisodesItemsPatchedBridge(subscription);
}

function addMediaEpisodesListChangedBridge(subscription: Subscription): void {
	addMainBusEventBridge(
		subscription,
		{
			// Preserve per-media granularity for list invalidation.
			source$:      BUS_MediaEpisodesListChanged.pipe(
				bufferTime(GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS),
				filter(batch => batch.length > 0),
				map(batch => Array.from(new Set(batch.map(event => event.mediaId)))),
				mergeMap(mediaIds => mediaIds),
				map(mediaId => ({ mediaId })),
			),
			notify:       createRendererChannelNotifier(IpcChannels.MediaEpisodesListChanged),
			errorContext: "group-explorer-events-bridge.media-episodes-list-changed",
		},
	);
}

function addMediaEpisodesItemsPatchedBridge(subscription: Subscription): void {
	addMainBusEventBridge(
		subscription,
		{
			source$:      BUS_MediaEpisodesItemsPatched.pipe(
				bufferTime(GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS),
				filter(batch => batch.length > 0),
				mergeMap((batch) => mergeEpisodePatchBurstsByMediaId(batch)),
			),
			notify:       createRendererChannelNotifier(IpcChannels.MediaEpisodesItemsPatched),
			errorContext: "group-explorer-events-bridge.media-episodes-items-patched",
		},
	);
}
