import {
	attachDatabase,
	detachDatabaseIfAttached,
	isDatabaseAttached,
} from "../init/database-attachment";
import { getDatabase } from "../utils/get-db";

// Database lifecycle service for the replaceable AnimeDB attachment. Callers own
// file rollback context; this service keeps SQLite driver operations inside the
// database layer without hiding swap failures.
export class AnimeDbAttachmentService {
	public static isAnimeDataAttached(): boolean {
		return isDatabaseAttached(
			getDatabase(),
			"anime_data",
		);
	}

	public static detachAnimeDataIfAttached(): boolean {
		return detachDatabaseIfAttached(
			getDatabase(),
			"anime_data",
		);
	}

	public static attachAnimeData(filePath: string): void {
		attachDatabase(
			getDatabase(),
			filePath,
			"anime_data",
		);
	}
}
