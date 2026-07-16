import { createSearchKey } from "@nimlat/functions";
import { AnimeGroupDetails } from "@nimlat/types/nimlat-anime";
import { getDatabase } from "../../../utils/get-db";

/**
 * Update the user-owned Group row directly.
 * This is used only after grouping has forked into user mode.
 */
export function updateUserGroupDetails(groupId: number, details: AnimeGroupDetails): boolean {
	// noinspection SqlResolve
	const result = getDatabase()
		.prepare(`
        UPDATE userGroups
        SET name        = ?,
            nameSearchKey = ?,
            description = ?,
            updatedAt   = ?
        WHERE id = ?
		`)
		.run(
			details.name,
			createSearchKey(details.name),
			details.description ?? null,
			Date.now(),
			groupId,
		);

	return result.changes > 0;
}
