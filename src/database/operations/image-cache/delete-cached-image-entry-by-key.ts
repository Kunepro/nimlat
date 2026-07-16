import { getDatabase } from "../../utils/get-db";

// Remove obsolete cache bookkeeping after its local file has been deleted.
export function deleteCachedImageEntryByKey(cacheKey: string): void {
	getDatabase()
		// noinspection SqlResolve
		.prepare<[ string ]>(`
      DELETE FROM image_data.cachedImages
      WHERE cacheKey = ?
		`)
		.run(cacheKey);
}
