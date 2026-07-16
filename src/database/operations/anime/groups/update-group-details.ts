import {
	createSearchKey,
	typeSafeError,
} from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { AnimeGroupDetails } from "@nimlat/types/nimlat-anime";
import { getDatabase } from "../../../utils/get-db";

// Update the details of an existing Group row.
export function updateGroupDetails(groupId: number, details: AnimeGroupDetails): boolean {
	const db = getDatabase();

	// Validate that name is not empty.
	if (!details.name || details.name.trim() === "") {
		throw new Error("Group name cannot be empty");
	}

	try {
		const normalizedName           = details.name.trim();
		const normalizedDescrgrouption = details.description?.trim() ?? "";

		// noinspection SqlResolve
		const updateGroup = db.prepare<[
			string,
			string,
			string,
			number,
				string | null,
			number
		]>(`
        UPDATE anime_data.groups
        SET name        = ?,
            nameSearchKey = ?,
            description = ?,
            imageUrl    = CASE WHEN ? = 1 THEN ? ELSE imageUrl END
        WHERE id = ?
		`);

		const runUpdate = db.transaction(() => {
			const result = updateGroup.run(
				normalizedName,
				createSearchKey(normalizedName),
				normalizedDescrgrouption,
				details.imageUrl === undefined ? 0 : 1,
				details.imageUrl || null,
				groupId,
			);

			if (result.changes === 0) {
				throw new Error(`Group with id ${ groupId } not found`);
			}
		});

		runUpdate();

		return true;
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.operations.groups.updateGroupDetails",
			typeSafeError(error),
			{
				groupId,
				details,
			},
		);

		throw error;
	}
}
