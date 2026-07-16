import { getDatabase } from "../../utils/get-db";

/**
 * Clear the active image selection for one owner and role so default source resolution applies again.
 */
export function deleteActiveImageSelection(ownerKind: string, ownerId: string, imageRole: string): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare(`
      DELETE
      FROM image_data.activeImageSelections
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
