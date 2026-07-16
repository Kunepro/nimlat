import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../../utils/get-db";
import { _assignOfficiallyRelatedMediasToGroup } from "../assign-officially-related-medias-to-group";
import { _insertGroup } from "./internal/_insert-group";

/**
 * Create a new Group and optionally link it to specific Medias.
 */
export function createGroup(group: Omit<GroupBlueprintDto, "id">, linkedMediaIds: number[] = []): number {
	const db = getDatabase();

	try {
		return db.transaction(() => {
			// Insert the new Group.
			const newGroupId = _insertGroup(
				db,
				group,
			);

			// Link Medias to the new Group if any were provided.
			if (linkedMediaIds.length > 0) {
				_assignOfficiallyRelatedMediasToGroup(
					db,
					newGroupId,
					linkedMediaIds,
				);
			}

			return newGroupId;
		})();
	} catch (error) {
		const dbError = typeSafeError(error);
		LoggerUtils.logErrorGroupCreate(
			group,
			dbError,
		);

		throw error;
	}
}


