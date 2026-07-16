import { AnimeDbFacade } from "@nimlat/database";
import { GroupBlueprintDto } from "@nimlat/types/anime-db";

// Build the preferred Group metadata from the Media; fall back to a deterministic name.
export function getGroupBlueprint(mediaId: number): Omit<GroupBlueprintDto, "id"> {
	return AnimeDbFacade.group.getBlueprintFromMedia(mediaId) || {
		baseMediaId: mediaId,
		name:        `Group-${ mediaId }`,
	};
}

// Keep the Group anchor deterministic across auto-grouping and manual selection flows.
export function resolveGroupBaseMediaId(mediaIds: number[]): number {
	if (mediaIds.length === 0) {
		throw new Error("At least one media is required to resolve a group blueprint.");
	}

	return Math.min(...mediaIds);
}

type GroupBlueprintOverrides = {
	name?: string;
	description?: string;
	imageUrl?: string;
};

// Reuse the anchor-media blueprint and only override fields the caller explicitly controls.
export function getGroupBlueprintForMediaSelection(
	mediaIds: number[],
	overrides: GroupBlueprintOverrides = {},
): Omit<GroupBlueprintDto, "id"> {
	const groupBlueprint = getGroupBlueprint(resolveGroupBaseMediaId(mediaIds));

	return {
		...groupBlueprint,
		...(overrides.name === undefined ? {} : { name: overrides.name }),
		...(overrides.description === undefined ? {} : { description: overrides.description }),
		...(overrides.imageUrl === undefined ? {} : { imageUrl: overrides.imageUrl }),
	};
}
