// @vitest-environment node
import type {
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

type GroupExplorerEventMap = {
	groupList: GroupListChangedEvent;
	groupMediaList: GroupMediaListChangedEvent;
	groupMediaItemsPatched: GroupMediaItemsPatchedEvent;
	mediaEpisodesList: MediaEpisodesListChangedEvent;
	mediaEpisodesItemsPatched: MediaEpisodesItemsPatchedEvent;
};

function installGroupExplorerApi() {
	const listeners: {
		[K in keyof GroupExplorerEventMap]?: (event: GroupExplorerEventMap[K]) => void;
	}                   = {};
	const unsubscribers = {
		groupList:                 vi.fn(),
		groupMediaList:            vi.fn(),
		groupMediaItemsPatched:    vi.fn(),
		mediaEpisodesList:         vi.fn(),
		mediaEpisodesItemsPatched: vi.fn(),
	};
	const groupExplorer = {
		onGroupListChanged:          vi.fn((listener: (event: GroupListChangedEvent) => void) => {
			listeners.groupList = listener;
			return unsubscribers.groupList;
		}),
		onGroupMediaListChanged:     vi.fn((listener: (event: GroupMediaListChangedEvent) => void) => {
			listeners.groupMediaList = listener;
			return unsubscribers.groupMediaList;
		}),
		onGroupMediaItemsPatched:    vi.fn((listener: (event: GroupMediaItemsPatchedEvent) => void) => {
			listeners.groupMediaItemsPatched = listener;
			return unsubscribers.groupMediaItemsPatched;
		}),
		onMediaEpisodesListChanged:  vi.fn((listener: (event: MediaEpisodesListChangedEvent) => void) => {
			listeners.mediaEpisodesList = listener;
			return unsubscribers.mediaEpisodesList;
		}),
		onMediaEpisodesItemsPatched: vi.fn((listener: (event: MediaEpisodesItemsPatchedEvent) => void) => {
			listeners.mediaEpisodesItemsPatched = listener;
			return unsubscribers.mediaEpisodesItemsPatched;
		}),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				groupExplorer,
			},
		},
	);

	return {
		groupExplorer,
		unsubscribers,
		emit<K extends keyof GroupExplorerEventMap>(kind: K, event: GroupExplorerEventMap[K]): void {
			listeners[ kind ]?.(event);
		},
	};
}

const groupRef: GroupRef = {
	source:  "official",
	groupId: 10,
};

describe(
	"GroupExplorerEventService",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"exposes shared group list events",
			async () => {
				const {
								emit,
								groupExplorer,
								unsubscribers,
							}                             = installGroupExplorerApi();
				const { GroupExplorerEventService } = await import("./group-explorer-event-service");
				const firstListener                 = vi.fn();
				const secondListener                = vi.fn();
				const event: GroupListChangedEvent  = { affectedGroups: [ groupRef ] };

				const firstSubscription  = GroupExplorerEventService.groupListChanges().subscribe(firstListener);
				const secondSubscription = GroupExplorerEventService.groupListChanges().subscribe(secondListener);

				expect(groupExplorer.onGroupListChanged).toHaveBeenCalledTimes(1);
				emit(
					"groupList",
					event,
				);
				expect(firstListener).toHaveBeenCalledWith(event);
				expect(secondListener).toHaveBeenCalledWith(event);

				firstSubscription.unsubscribe();
				expect(unsubscribers.groupList).not.toHaveBeenCalled();

				secondSubscription.unsubscribe();
				expect(unsubscribers.groupList).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"wires the remaining group and episode event streams",
			async () => {
				const {
								emit,
								groupExplorer,
							}                                                 = installGroupExplorerApi();
				const { GroupExplorerEventService }                     = await import("./group-explorer-event-service");
				const groupMediaListListener                            = vi.fn();
				const groupMediaPatchListener                           = vi.fn();
				const episodeListListener                               = vi.fn();
				const episodePatchListener                              = vi.fn();
				const groupMediaListEvent: GroupMediaListChangedEvent   = {
					groups:           [ groupRef ],
					affectedMediaIds: [ 1 ],
				};
				const groupMediaPatchEvent: GroupMediaItemsPatchedEvent = {
					group:   groupRef,
					patches: [ { mediaId: 1 } ],
				};
				const episodeListEvent: MediaEpisodesListChangedEvent   = { mediaId: 1 };
				const episodePatchEvent: MediaEpisodesItemsPatchedEvent = {
					mediaId: 1,
					patches: [ { episodeNumber: 2 } ],
				};

				const subscriptions = [
					GroupExplorerEventService.groupMediaListChanges().subscribe(groupMediaListListener),
					GroupExplorerEventService.groupMediaItemsPatched().subscribe(groupMediaPatchListener),
					GroupExplorerEventService.mediaEpisodesListChanges().subscribe(episodeListListener),
					GroupExplorerEventService.mediaEpisodesItemsPatched().subscribe(episodePatchListener),
				];

				expect(groupExplorer.onGroupMediaListChanged).toHaveBeenCalledTimes(1);
				expect(groupExplorer.onGroupMediaItemsPatched).toHaveBeenCalledTimes(1);
				expect(groupExplorer.onMediaEpisodesListChanged).toHaveBeenCalledTimes(1);
				expect(groupExplorer.onMediaEpisodesItemsPatched).toHaveBeenCalledTimes(1);

				emit(
					"groupMediaList",
					groupMediaListEvent,
				);
				emit(
					"groupMediaItemsPatched",
					groupMediaPatchEvent,
				);
				emit(
					"mediaEpisodesList",
					episodeListEvent,
				);
				emit(
					"mediaEpisodesItemsPatched",
					episodePatchEvent,
				);

				expect(groupMediaListListener).toHaveBeenCalledWith(groupMediaListEvent);
				expect(groupMediaPatchListener).toHaveBeenCalledWith(groupMediaPatchEvent);
				expect(episodeListListener).toHaveBeenCalledWith(episodeListEvent);
				expect(episodePatchListener).toHaveBeenCalledWith(episodePatchEvent);

				subscriptions.forEach(subscription => subscription.unsubscribe());
			},
		);
	},
);
