import { AnimeDbFacade } from "@nimlat/database";
import { GroupMutationService } from "../../services/group/group-mutation-service";
import { getGroupBlueprint } from "./get-group-blueprint";

export type ChildRelation = {
	mediaId: number;
};

// Ensure a parent-anchored Group exists and contains the parent plus its direct children.
export function handleReferencedAsParent(mediaId: number, children: ChildRelation[]): void {
	if (!children.length) {
		return;
	}

	const childMediaIds      = children.map((child) => child.mediaId);
	const targetMediaIds     = childMediaIds.concat(mediaId);
	const groupAlreadyExists = AnimeDbFacade.group.selectIdByBaseMediaId(mediaId);
	if (groupAlreadyExists) {
		GroupMutationService.assignMediasToGroup(
			groupAlreadyExists.id,
			targetMediaIds,
			true,
		);
	} else {
		GroupMutationService.createGroup(
			getGroupBlueprint(mediaId),
			targetMediaIds,
		);
	}

}
