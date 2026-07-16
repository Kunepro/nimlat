import {
	createCombinedSearchKey,
	typeSafeError,
} from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { getDatabase } from "../../../utils/get-db";

export interface MediaDetailsUpdateInput {
	name: string;
	description?: string;
	customImageUrl?: string | null;
}

// Update mutable Media metadata stored locally in SQLite.
export function updateMediaDetails(mediaId: number, details: MediaDetailsUpdateInput): boolean {
	const db = getDatabase();

	if (!details.name || details.name.trim() === "") {
		throw new Error("Media title cannot be empty");
	}

	try {
		// noinspection SqlResolve
		const updateMedia = db.prepare<[
			string,
			string,
			string,
			number,
				string | null,
			number
		]>(`
        UPDATE anime_data.media
        SET name           = ?,
            nameSearchKey  = ?,
            description    = ?,
            customImageUrl = CASE WHEN ? = 1 THEN ? ELSE customImageUrl END
        WHERE mediaId = ?
		`);

		const runUpdate = db.transaction(() => {
			const normalizedName = details.name.trim();
			const result = updateMedia.run(
				normalizedName,
				createCombinedSearchKey([
					normalizedName,
					`Media ${ mediaId }`,
				]),
				details.description?.trim() ?? "",
				details.customImageUrl === undefined ? 0 : 1,
				details.customImageUrl || null,
				mediaId,
			);

			if (result.changes === 0) {
				throw new Error(`Media with mediaId ${ mediaId } not found`);
			}
		});

		runUpdate();
		return true;
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.operations.medias.updateMediaDetails",
			typeSafeError(error),
			{
				mediaId,
				details,
			},
		);
		throw error;
	}
}
