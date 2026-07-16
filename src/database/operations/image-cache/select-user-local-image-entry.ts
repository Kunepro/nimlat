import { UserLocalImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Read one user-owned local image override by owner identity and image role.
 */
export function selectUserLocalImageEntry(
	ownerKind: UserLocalImageEntryDto["ownerKind"],
	ownerId: string,
	imageRole: UserLocalImageEntryDto["imageRole"],
): UserLocalImageEntryDto | null {
	const row = getDatabase()
		// noinspection SqlResolve
		.prepare<
			[ UserLocalImageEntryDto["ownerKind"], string, UserLocalImageEntryDto["imageRole"] ],
			UserLocalImageEntryDto
		>(`
      SELECT ownerKind,
             ownerId,
             imageRole,
             localPath,
             createdAt,
             updatedAt
      FROM image_data.userLocalImages
      WHERE ownerKind = ?
        AND ownerId = ?
        AND imageRole = ?
		`)
		.get(
			ownerKind,
			ownerId,
			imageRole,
		);

	return row ?? null;
}
