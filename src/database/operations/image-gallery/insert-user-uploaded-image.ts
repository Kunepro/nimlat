import { UserUploadedImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Persist one newly stored uploaded-image asset and return its new id.
 */
export function insertUserUploadedImage(input: {
	ownerKind: UserUploadedImageEntryDto["ownerKind"];
	ownerId: string;
	imageRole: UserUploadedImageEntryDto["imageRole"];
	localPath: string;
}): number {
	const now    = Date.now();
	// noinspection SqlResolve
	const result = getDatabase()
		.prepare(`
        INSERT INTO image_data.userUploadedImages (ownerKind,
                                                   ownerId,
                                                   imageRole,
                                                   localPath,
                                                   createdAt,
                                                   updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
		`)
		.run(
			input.ownerKind,
			input.ownerId,
			input.imageRole,
			input.localPath,
			now,
			now,
		);

	return Number(result.lastInsertRowid);
}
