import { GroupExplorerEventsFacade } from "./group-explorer/group-explorer-events.facade";
import { GroupExplorerGalleryFacade } from "./group-explorer/group-explorer-gallery.facade";
import { GroupExplorerMutationFacade } from "./group-explorer/group-explorer-mutation.facade";
import { GroupExplorerReadFacade } from "./group-explorer/group-explorer-read.facade";

// Stable renderer control panel for Library/group/media exploration. Subfacades
// keep read, mutation, gallery, and event-stream concerns easy to scan.
export const GroupExplorerFacade = {
	...GroupExplorerReadFacade,
	...GroupExplorerMutationFacade,
	...GroupExplorerGalleryFacade,
	...GroupExplorerEventsFacade,
} as const;
