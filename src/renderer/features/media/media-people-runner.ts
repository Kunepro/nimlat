import type {
	MediaCharacterListItem,
	MediaStaffListItem,
} from "@nimlat/types/ipc-payloads";
import { GroupExplorerFacade } from "../../facades";

// Read-side boundary for people credits attached to a Media. Hooks own route
// lifecycle and presentation state; this runner only delegates to preload/IPC.
export function listMediaCharacters(mediaId: number): Promise<MediaCharacterListItem[]> {
	return GroupExplorerFacade.listMediaCharacters(mediaId);
}

export function listMediaStaff(mediaId: number): Promise<MediaStaffListItem[]> {
	return GroupExplorerFacade.listMediaStaff(mediaId);
}
