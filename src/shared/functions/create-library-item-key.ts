import {
	GroupRef,
	LibraryItemKey,
	MediaId,
} from "../types/nimlat-ids";

// Build stable renderer keys for mixed Library rows without relying on one shared numeric id space.
// This keeps virtualized lists and cached row maps safe once official groups, user groups, and medias
// are displayed together.
export function createLibraryItemKey(input:
																			 | {
																			 kind: "group";
																			 group: GroupRef;
																		 }
																			 | {
																			 kind: "media";
																			 mediaId: MediaId;
																		 },
): LibraryItemKey {
	if (input.kind === "group") {
		return `group:${ input.group.source }:${ input.group.groupId }`;
	}

	return `media:${ input.mediaId }`;
}

// Convenience wrapper for callers that already know they are building a Group row key.
export function createGroupLibraryItemKey(group: GroupRef): LibraryItemKey {
	return createLibraryItemKey({
		kind: "group",
		group,
	});
}
