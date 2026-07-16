import { AnimeDbFacade } from "@nimlat/database";
import { GroupMutationService } from "../../services/group/group-mutation-service";
import {
	getGroupBlueprint,
	resolveGroupBaseMediaId,
} from "./get-group-blueprint";

export type NonParentRelation = {
	relatedMediaId: number;
};

// Group non-parent related Medias under one deterministic anchor Group (lowest AniList id).
export function handleNonParentRelations(mediaId: number, nonParents: NonParentRelation[]): void {
	const relatedIds    = nonParents.map((relation) => relation.relatedMediaId);
	const allIds        = Array.from(new Set([
		...relatedIds,
		mediaId,
	]));
	const baseMediaId   = resolveGroupBaseMediaId(allIds);
	const existingGroup = AnimeDbFacade.group.selectIdByBaseMediaId(baseMediaId);

	if (existingGroup) {
		GroupMutationService.assignMediasToGroup(
			existingGroup.id,
			allIds,
			true,
		);
		return;
	}

	GroupMutationService.createGroup(
		getGroupBlueprint(baseMediaId),
		allIds,
	);
}
