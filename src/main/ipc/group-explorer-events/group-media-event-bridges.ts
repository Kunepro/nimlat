import {
	BUS_GroupListChanged,
	BUS_GroupMediaItemsPatched,
	BUS_GroupMediaListChanged,
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
	chunkValues,
	collectUniqueGroupRefs,
	collectUniqueIds,
	GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS,
	MAX_GROUP_MEDIA_CHANGED_IDS_PER_EVENT,
	mergePatchesById,
} from "./group-explorer-event-bridge-utils";

export function addGroupExplorerGroupEventBridges(subscription: Subscription): void {
	addGroupListChangedBridge(subscription);
	addGroupMediaListChangedBridge(subscription);
	addGroupMediaItemsPatchedBridge(subscription);
}

function addGroupListChangedBridge(subscription: Subscription): void {
	// Coalesce bursts into one list invalidation event per bridge window.
	addMainBusEventBridge(
		subscription,
		{
			source$:      BUS_GroupListChanged.pipe(
				bufferTime(GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS),
				filter(batch => batch.length > 0),
				map((batch) => ({
					affectedGroups: collectUniqueGroupRefs(
						batch,
						(event) => event.affectedGroups,
					),
				})),
			),
			notify:       createRendererChannelNotifier(IpcChannels.GroupListChanged),
			errorContext: "group-explorer-events-bridge.group-list-changed",
		},
	);
}

function addGroupMediaListChangedBridge(subscription: Subscription): void {
	addMainBusEventBridge(
		subscription,
		{
			source$:      BUS_GroupMediaListChanged.pipe(
				bufferTime(GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS),
				filter(batch => batch.length > 0),
				map((batch) => ({
					groups:           collectUniqueGroupRefs(
						batch,
						(event) => event.groups,
					),
					affectedMediaIds: collectUniqueIds(
						batch,
						(event) => event.affectedMediaIds,
					) ?? [],
				})),
				filter(event => event.affectedMediaIds.length > 0),
				mergeMap(event => chunkValues(
					event.affectedMediaIds,
					MAX_GROUP_MEDIA_CHANGED_IDS_PER_EVENT,
				).map(affectedMediaIds => ({
					...event,
					affectedMediaIds,
				}))),
			),
			notify:       createRendererChannelNotifier(IpcChannels.GroupMediaListChanged),
			errorContext: "group-explorer-events-bridge.group-media-list-changed",
		},
	);
}

function addGroupMediaItemsPatchedBridge(subscription: Subscription): void {
	addMainBusEventBridge(
		subscription,
		{
			source$:      BUS_GroupMediaItemsPatched.pipe(
				bufferTime(GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS),
				filter(batch => batch.length > 0),
				map((batch) => {
					const scopedGroups = collectUniqueGroupRefs(
						batch,
						(event) => event.group ? [ event.group ] : undefined,
					);
					return {
						// Keep group scope only when all batched patches target the same Group scope.
						group:   scopedGroups?.length === 1 ? scopedGroups[ 0 ] : undefined,
						patches: mergePatchesById(
							batch.flatMap((event) => event.patches),
							(patch) => patch.mediaId,
							"mediaId",
						) as Array<{ mediaId: number } & Record<string, unknown>>,
					};
				}),
				// Imports can update an entire account at once. Keep renderer payloads
				// bounded so one large watchlist cannot create an unbounded IPC message.
				mergeMap(event => chunkValues(
					event.patches,
					MAX_GROUP_MEDIA_CHANGED_IDS_PER_EVENT,
				).map(patches => ({
					...event,
					patches,
				}))),
			),
			notify:       createRendererChannelNotifier(IpcChannels.GroupMediaItemsPatched),
			errorContext: "group-explorer-events-bridge.group-media-items-patched",
		},
	);
}
