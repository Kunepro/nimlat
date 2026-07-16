import { ActiveImageSelectionDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Read the current active image selection for one owner and role.
 */
export function selectActiveImageSelection(
	ownerKind: ActiveImageSelectionDto["ownerKind"],
	ownerId: string,
	imageRole: ActiveImageSelectionDto["imageRole"],
): ActiveImageSelectionDto | null {
	const row = getDatabase()
		// noinspection SqlResolve
		.prepare<
			[ ActiveImageSelectionDto["ownerKind"], string, ActiveImageSelectionDto["imageRole"] ],
			ActiveImageSelectionDto
		>(`
      SELECT ownerKind,
             ownerId,
             imageRole,
             sourceKind,
             sourceValue,
             updatedAt
      FROM image_data.activeImageSelections
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
