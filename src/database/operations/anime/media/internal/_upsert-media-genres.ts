import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { GenreDto } from "@nimlat/types/anime-db";
import { Database } from "better-sqlite3";

export function _upsertMediaGenres(db: Database, mediaId: number, media: AniListMedia): void {
	// noinspection SqlResolve
	const insertGenre      = db.prepare(`INSERT OR IGNORE INTO anime_data.genres (name)
                                       VALUES (?)`);
	const selectGenreId    = db.prepare<[ string ], Pick<GenreDto, "id">>(
		`SELECT id FROM anime_data.genres WHERE name = ?`,
	);
	// noinspection SqlResolve
	const insertMediaGenre = db.prepare(
		`INSERT OR IGNORE INTO anime_data.mediaGenres (mediaId, genreId)
     VALUES (?, ?)`,
	);

	for (const genreName of media.genres || []) {
		insertGenre.run(genreName);

		const row = selectGenreId.get(genreName);
		if (!row) {
			continue;
		}

		insertMediaGenre.run(
			mediaId,
			row.id,
		);
	}
}
