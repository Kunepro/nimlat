import { MediaDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";

// Resolve a stable diagnostic label for hydration progress/errors. Missing rows
// still receive an ID-based label so queue failures remain actionable even when
// the associated catalog write was incomplete.
export function getMediaName(mediaId: number): string {
	const db = getDatabase();

	const stmt     = db.prepare<[ number ], Pick<MediaDto, "name">>(`
        SELECT COALESCE(
            anime_data.media.name,
            anime_data.media.nameRomanji,
            anime_data.media.nameJapanese,
            'Media ' || anime_data.media.mediaId
        ) as name
        FROM anime_data.media
        WHERE anime_data.media.mediaId = ?
    `);
	const mediaRow = stmt.get(mediaId);
	return mediaRow?.name || `Media ${ mediaId }`;
}



