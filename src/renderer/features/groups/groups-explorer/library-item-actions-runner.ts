import type {
	GroupExplorerCard,
	GroupRefreshActionResult,
	LibraryDisplayItem,
	LibrarySelectionInput,
	MediaRefreshActionResult,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	GroupAssignmentsFacade,
	GroupExplorerFacade,
} from "../../../facades";
import {
	getLibraryItemActionTarget,
	selectExistingGroupAddToCommand,
	selectNewGroupAddToCommand,
} from "./library-item-actions-model";

const ADD_TO_GROUP_TARGETS_PAGE_SIZE = 200;

// Library item actions can target either a group shell or a standalone media.
// Keeping that routing here prevents hooks from knowing facade payload details.
export function persistLibraryItemWatchState(
	item: LibraryDisplayItem,
	isWatched: boolean,
) {
	const target = getLibraryItemActionTarget(item);
	if (target?.kind === "group") {
		return GroupExplorerFacade.setGroupWatchState({
			group: target.group,
			isWatched,
		});
	}

	if (target?.kind === "media") {
		return GroupExplorerFacade.setMediaWatchState({
			mediaIds: [ target.mediaId ],
			isWatched,
		});
	}

	return null;
}

export async function persistLibraryItemRefresh(item: LibraryDisplayItem): Promise<GroupRefreshActionResult | MediaRefreshActionResult | null> {
	const target = getLibraryItemActionTarget(item);
	if (target?.kind === "group") {
		return GroupExplorerFacade.refreshGroup(target.group);
	}

	if (target?.kind === "media") {
		return GroupExplorerFacade.refreshMedia(target.mediaId);
	}

	return null;
}

export function deleteLibraryManualGroup(group: GroupRef) {
	return GroupAssignmentsFacade.deleteGroupManual({ group });
}

export function persistAddToExistingGroup({
																						groupId,
																						hasMergeableSelectedGroups,
																						isPreferredTarget,
																						selectionInputs,
																					}: {
	groupId: number;
	hasMergeableSelectedGroups: boolean;
	isPreferredTarget: boolean;
	selectionInputs: LibrarySelectionInput[];
}) {
	const command = selectExistingGroupAddToCommand({
		hasMergeableSelectedGroups,
		isPreferredTarget,
	});
	return command === "mergeIntoTarget"
		? GroupAssignmentsFacade.mergeLibrarySelectionIntoGroup({
			targetGroupId: groupId,
			items:         selectionInputs,
		})
		: GroupAssignmentsFacade.assignLibrarySelectionToGroup({
			groupId,
			items: selectionInputs,
		});
}

export function persistAddToNewGroup({
																			 createName,
																			 hasSelectedGroup,
																			 selectionInputs,
																		 }: {
	createName: string;
	hasSelectedGroup: boolean;
	selectionInputs: LibrarySelectionInput[];
}) {
	const command = selectNewGroupAddToCommand(hasSelectedGroup);
	return command === "createMergedGroup"
		? GroupAssignmentsFacade.createMergedGroupFromLibrarySelection({
			name:  createName,
			items: selectionInputs,
		})
		: GroupAssignmentsFacade.createGroupFromLibrarySelection({
			name:  createName,
			items: selectionInputs,
		});
}

export async function loadAddToGroupTargetGroups(): Promise<GroupExplorerCard[]> {
	const groups: GroupExplorerCard[] = [];
	let offset                        = 0;

	while (true) {
		const page = await GroupExplorerFacade.listCards(
			offset,
			ADD_TO_GROUP_TARGETS_PAGE_SIZE,
			"",
		);
		groups.push(...page.cards);
		if (page.nextOffset == null) {
			return groups;
		}
		offset = page.nextOffset;
	}
}
