import { UserUploadedImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Read all persisted uploaded-image rows for one owner and image role.
 */
export function selectUserUploadedImagesByOwner(
	ownerKind: UserUploadedImageEntryDto["ownerKind"],
	ownerId: string,
	imageRole: UserUploadedImageEntryDto["imageRole"],
): UserUploadedImageEntryDto[] {
	return getDatabase()
		// noinspection SqlResolve
		.prepare<
			[ UserUploadedImageEntryDto["ownerKind"], string, UserUploadedImageEntryDto["imageRole"] ],
			UserUploadedImageEntryDto
		>(`
      SELECT id,
             ownerKind,
             ownerId,
             imageRole,
             localPath,
             createdAt,
             updatedAt
      FROM image_data.userUploadedImages
      WHERE ownerKind = ?
        AND ownerId = ?
        AND imageRole = ?
      ORDER BY createdAt DESC, id DESC
		`)
		.all(
			ownerKind,
			ownerId,
			imageRole,
		);
}
