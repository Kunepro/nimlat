import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import { getGroupBlueprintFromMedia } from "./get-blueprint-from-media/get-group-blueprint-from-media";
import { mapMediaBlueprintToGroupBlueprintDto } from "./get-blueprint-from-media/map-media-blueprint-to-legacy-group-dto";

// Keep the legacy DTO mapping beside the group read operation so the facade
// remains a thin dispatch surface instead of owning blueprint conversion logic.
export function selectGroupBlueprintFromMedia(mediaId: number): Omit<GroupBlueprintDto, "id"> | undefined {
	const blueprint = getGroupBlueprintFromMedia().get(mediaId);
	return blueprint && mapMediaBlueprintToGroupBlueprintDto(blueprint);
}
