import { AnimeDbFacade } from "@nimlat/database";
import { GroupMutationService } from "../../services/group/group-mutation-service";
import { getGroupBlueprint } from "./get-group-blueprint";

export type ParentRelation = {
	relatedMediaId: number;
};

// Link the Media to each parent Group, creating missing parent-anchored Groups on demand.
export function handleParentRelations(mediaId: number, parents: ParentRelation[]): void {
	for (const parent of parents) {
		const parentGroupId = AnimeDbFacade.group.selectIdByBaseMediaId(parent.relatedMediaId)?.id;

		if (parentGroupId) {
			GroupMutationService.assignMediasToGroup(
				parentGroupId,
				[ mediaId ],
				true,
			);
			continue;
		}

		GroupMutationService.createGroup(
			getGroupBlueprint(parent.relatedMediaId),
			[
				parent.relatedMediaId,
				mediaId,
			],
		);
	}
}
