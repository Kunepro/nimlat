import type {
	GroupInspectionMediaCard,
	GroupInspectionSummary,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { ROUTES } from "../../../constants/route-config";
import {
	createRouteHistoryState,
	type NimlatRouteHistoryStateUpdater,
} from "../../../types/router-history-state";

export type GroupMediaGridOverlayState =
	| { type: "loading" }
	| { type: "error"; message: string }
	| { type: "empty" }
	| { type: "none" };

export interface EditableGroupNavigationTarget {
	params: {
		groupId: string;
		groupSource: "user";
	};
	replace: true;
	state: NimlatRouteHistoryStateUpdater;
	to: typeof ROUTES.GROUPS.GROUP.FULL_URL;
}

export function resolveGroupMediaExplorerRef(
	groupSource: string | undefined,
	groupId: string | undefined,
): GroupRef | null {
	const numericGroupId = Number(groupId);
	if ((groupSource !== "official" && groupSource !== "user") || Number.isNaN(numericGroupId)) {
		return null;
	}

	return {
		source:  groupSource,
		groupId: numericGroupId,
	};
}

export function isSameGroupMediaExplorerRef(
	left: GroupRef | undefined,
	right: GroupRef | null,
): boolean {
	return Boolean(
		left
		&& right
		&& left.source === right.source
		&& left.groupId === right.groupId,
	);
}

export function createEditableGroupNavigationTarget(
	group: GroupInspectionSummary | null,
	groupSource: string,
): EditableGroupNavigationTarget | null {
	if (!group || groupSource !== "official") {
		return null;
	}

	// Removing media from an official group materializes a user-owned editable
	// group. Route replacement keeps subsequent wall actions on the mutable copy.
	return {
		to:      ROUTES.GROUPS.GROUP.FULL_URL,
		params:  {
			groupSource: "user",
			groupId:     group.groupId.toString(),
		},
		state:   createRouteHistoryState({
			groupName: group.name,
		}),
		replace: true,
	};
}

export function shouldShowGroupMediaRemoveUndo(
	allowUndo: boolean,
	removedCount: number,
): boolean {
	// Multi-remove intentionally skips undo because each restore is a separate
	// manual assignment and the current UI has no bulk undo status surface.
	return allowUndo && removedCount === 1;
}

export function shouldRefreshGroupMediaForListChange(
	groupRef: GroupRef | null,
	event: GroupMediaListChangedEvent,
): boolean {
	if (!groupRef) {
		return false;
	}
	return !(event.groups && !event.groups.some(eventGroup => isSameGroupMediaExplorerRef(
		eventGroup,
		groupRef,
	)));


}

export function shouldApplyGroupMediaPatchEvent(
	groupRef: GroupRef | null,
	event: GroupMediaItemsPatchedEvent,
): boolean {
	if (!groupRef || event.patches.length === 0) {
		return false;
	}
	return !(event.group && !isSameGroupMediaExplorerRef(
		event.group,
		groupRef,
	));


}

export function getGroupMediaGridOverlayState({
																								hasLoadedMediaRange,
																								mediaRangeErrorMessage,
																								totalMediaItems,
																							}: {
	hasLoadedMediaRange: boolean;
	mediaRangeErrorMessage: string | null;
	totalMediaItems: number;
}): GroupMediaGridOverlayState {
	if (!hasLoadedMediaRange) {
		return { type: "loading" };
	}

	if (mediaRangeErrorMessage) {
		return {
			type:    "error",
			message: mediaRangeErrorMessage,
		};
	}

	if (totalMediaItems === 0) {
		return { type: "empty" };
	}

	return { type: "none" };
}

export function resolveGroupMediaPreviousWatchState(
	media: GroupInspectionMediaCard,
	watchStateOverrides: ReadonlyMap<number, boolean>,
): boolean {
	return watchStateOverrides.get(media.mediaId) ?? media.isWatched === true;
}

export function setGroupMediaWatchOverride(
	currentOverrides: ReadonlyMap<number, boolean>,
	mediaId: number,
	isWatched: boolean,
): Map<number, boolean> {
	return new Map(currentOverrides).set(
		mediaId,
		isWatched,
	);
}

// Rollbacks only apply if the optimistic value is still current. A later user
// toggle can update the override before an older IPC write fails.
export function restoreGroupMediaWatchOverride(
	currentOverrides: Map<number, boolean>,
	mediaId: number,
	failedOptimisticValue: boolean,
	previousWatched: boolean,
): Map<number, boolean> {
	return currentOverrides.get(mediaId) === failedOptimisticValue
		? setGroupMediaWatchOverride(
			currentOverrides,
			mediaId,
			previousWatched,
		)
		: currentOverrides;
}
