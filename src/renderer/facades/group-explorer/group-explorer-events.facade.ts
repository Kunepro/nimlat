import { GroupExplorerEventService } from "../../services/group-explorer-event-service";

type GroupExplorerEventsApi = typeof GroupExplorerEventService;

// Renderer event facade exposes Observable streams; callback-shaped preload
// listeners stay hidden in renderer services.
export const GroupExplorerEventsFacade = {
	groupListChanges: (...args: Parameters<GroupExplorerEventsApi["groupListChanges"]>): ReturnType<GroupExplorerEventsApi["groupListChanges"]> => {
		return GroupExplorerEventService.groupListChanges(...args);
	},

	groupMediaListChanges: (...args: Parameters<GroupExplorerEventsApi["groupMediaListChanges"]>): ReturnType<GroupExplorerEventsApi["groupMediaListChanges"]> => {
		return GroupExplorerEventService.groupMediaListChanges(...args);
	},

	groupMediaItemsPatched: (...args: Parameters<GroupExplorerEventsApi["groupMediaItemsPatched"]>): ReturnType<GroupExplorerEventsApi["groupMediaItemsPatched"]> => {
		return GroupExplorerEventService.groupMediaItemsPatched(...args);
	},

	mediaEpisodesListChanges: (...args: Parameters<GroupExplorerEventsApi["mediaEpisodesListChanges"]>): ReturnType<GroupExplorerEventsApi["mediaEpisodesListChanges"]> => {
		return GroupExplorerEventService.mediaEpisodesListChanges(...args);
	},

	mediaEpisodesItemsPatched: (...args: Parameters<GroupExplorerEventsApi["mediaEpisodesItemsPatched"]>): ReturnType<GroupExplorerEventsApi["mediaEpisodesItemsPatched"]> => {
		return GroupExplorerEventService.mediaEpisodesItemsPatched(...args);
	},
} as const;
