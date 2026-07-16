import { getDatabase } from "../../utils/get-db";

/**
 * Remove one uploaded-image row when its local file is no longer present on disk.
 */
export function deleteUserUploadedImageById(id: number): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare(`
      DELETE
      FROM image_data.userUploadedImages
      WHERE id = ?
		`)
		.run(id);
}
