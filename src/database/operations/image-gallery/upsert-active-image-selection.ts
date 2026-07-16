import { ActiveImageSelectionDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Persist the chosen active image candidate for one owner and role.
 */
export function upsertActiveImageSelection(input: {
	ownerKind: ActiveImageSelectionDto["ownerKind"];
	ownerId: string;
	imageRole: ActiveImageSelectionDto["imageRole"];
	sourceKind: ActiveImageSelectionDto["sourceKind"];
	sourceValue: string;
}): void {
	const now = Date.now();
	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        INSERT INTO image_data.activeImageSelections (ownerKind,
                                                      ownerId,
                                                      imageRole,
                                                      sourceKind,
                                                      sourceValue,
                                                      updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(ownerKind, ownerId, imageRole) DO UPDATE SET sourceKind  = excluded.sourceKind,
                                                                 sourceValue = excluded.sourceValue,
                                                                 updatedAt   = excluded.updatedAt
		`)
		.run(
			input.ownerKind,
			input.ownerId,
			input.imageRole,
			input.sourceKind,
			input.sourceValue,
			now,
		);
}
