import { UserUploadedImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Read one uploaded-image row by its persisted id.
 */
export function selectUserUploadedImageById(id: number): UserUploadedImageEntryDto | null {
	const row = getDatabase()
		// noinspection SqlResolve
		.prepare<[ number ], UserUploadedImageEntryDto>(`
      SELECT id,
             ownerKind,
             ownerId,
             imageRole,
             localPath,
             createdAt,
             updatedAt
      FROM image_data.userUploadedImages
      WHERE id = ?
		`)
		.get(id);

	return row ?? null;
}
