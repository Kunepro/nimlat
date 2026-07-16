import type {
	GroupRef,
	MediaId,
} from "./nimlat-ids";

export interface GroupManualAssignMediasRequest {
	groupId: number;
	mediaIds: MediaId[];
}

export type LibrarySelectionInput =
	| {
	kind: "group";
	group: GroupRef;
}
	| {
	kind: "media";
	mediaId: MediaId;
};

export interface GroupManualRemoveMediaRequest {
	groupId: number;
	mediaId: MediaId;
}

export interface GroupManualDeleteRequest {
	group: GroupRef;
}

export interface GroupManualAssignLibrarySelectionRequest {
	groupId: number;
	items: LibrarySelectionInput[];
}

export interface GroupManualCreateGroupFromLibrarySelectionRequest {
	name: string;
	items: LibrarySelectionInput[];
}

export interface GroupManualMergeLibrarySelectionRequest {
	targetGroupId: number;
	items: LibrarySelectionInput[];
}

export interface GroupManualCreateMergedGroupFromLibrarySelectionRequest {
	name: string;
	items: LibrarySelectionInput[];
}

export interface GroupManualMergeRequest {
	targetGroupId: number;
	sourceGroupIds: number[];
}

export interface GroupRestoreDeletedLineageRequest {
	groupLineageId: number;
}

export type GroupMutationActionResult =
	| { success: true }
	| { success: false; error: string };

export type GroupMediaAssignmentActionResult = GroupMutationActionResult;

export type GroupCreateFromSelectionActionResult =
	| { success: true; createdGroupId: number }
	| { success: false; error: string };

export type GroupRestoreDeletedLineageActionResult =
	| { success: true; restoredGroupId: number }
	| { success: false; error: string };

export type GroupRefreshActionResult =
	| { success: true }
	| { success: false; error: string };

export interface UpdateGroupDetailsRequest {
	group: GroupRef;
	name: string;
	description?: string;
}

export type GroupUpdateDetailsActionResult =
	| { success: true }
	| { success: false; error: string };

export type GroupImageSelectionResult =
	| { success: true; imagePath: string }
	| { success: false; canceled: true };
