import {
	ImageOwnerKind,
	ImageRole,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Remove one user-owned local image override row by owner identity and image role.
 */
export function deleteUserLocalImageEntry(
	ownerKind: ImageOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare(`
      DELETE
      FROM image_data.userLocalImages
      WHERE ownerKind = ?
        AND ownerId = ?
        AND imageRole = ?
		`)
		.run(
			ownerKind,
			ownerId,
			imageRole,
		);
}
