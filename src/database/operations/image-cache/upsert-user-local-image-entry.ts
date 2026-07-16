import { UserLocalImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Persist or replace one user-owned local image override row.
 */
export function upsertUserLocalImageEntry(input: {
	ownerKind: UserLocalImageEntryDto["ownerKind"];
	ownerId: string;
	imageRole: UserLocalImageEntryDto["imageRole"];
	localPath: string;
}): void {
	const now = Date.now();
	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        INSERT INTO image_data.userLocalImages (ownerKind,
                                                ownerId,
                                                imageRole,
                                                localPath,
                                                createdAt,
                                                updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(ownerKind, ownerId, imageRole) DO UPDATE SET localPath = excluded.localPath,
                                                                 updatedAt = excluded.updatedAt
		`)
		.run(
			input.ownerKind,
			input.ownerId,
			input.imageRole,
			input.localPath,
			now,
			now,
		);
}
