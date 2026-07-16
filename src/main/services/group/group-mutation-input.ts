import type {
	GroupBlueprintDto,
	UserGroupBlueprintDto,
} from "@nimlat/types/anime-db";
import { getGroupBlueprintForMediaSelection } from "../../utils/compute-group-for-new-media/get-group-blueprint";

export interface PreparedNamedMediaSelection {
	name: string;
	mediaIds: number[];
}

// Keep manual Group mutation validation in one pure place so user and admin
// paths cannot drift on trimming, deduping, or empty-selection guardrails.
export function prepareNamedMediaSelection(name: string, mediaIds: number[]): PreparedNamedMediaSelection {
	const trimmedName    = name.trim();
	const uniqueMediaIds = Array.from(new Set(mediaIds));
	if (trimmedName.length === 0) {
		throw new Error("Group name is required.");
	}
	if (uniqueMediaIds.length === 0) {
		throw new Error("Select at least one media or group first.");
	}

	return {
		name:     trimmedName,
		mediaIds: uniqueMediaIds,
	};
}

export function createOfficialGroupBlueprintFromSelection(selection: PreparedNamedMediaSelection): Omit<GroupBlueprintDto, "id"> {
	return getGroupBlueprintForMediaSelection(
		selection.mediaIds,
		{ name: selection.name },
	);
}

export function createUserGroupBlueprintFromSelection(selection: PreparedNamedMediaSelection, now: number): Omit<UserGroupBlueprintDto, "id"> {
	return {
		...getGroupBlueprintForMediaSelection(
			selection.mediaIds,
			{ name: selection.name },
		),
		isUserCreated: 1,
		createdAt:     now,
		updatedAt:     now,
	};
}
