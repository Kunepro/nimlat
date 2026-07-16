import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { Database } from "better-sqlite3";

export function _upsertMediaTags(db: Database, mediaId: number, media: AniListMedia): void {
	// noinspection SqlResolve
	const insertTag      = db.prepare(`
      INSERT OR
      REPLACE
      INTO anime_data.tags
      (id, name, description, category, rank, isGeneralSpoiler, isMediaSpoiler)
      VALUES (@id, @name, @description, @category, @rank, @isGeneralSpoiler, @isMediaSpoiler)
	`);
	// noinspection SqlResolve
	const insertMediaTag = db.prepare(`
      INSERT OR IGNORE INTO anime_data.mediaTags (mediaId, tagId)
      VALUES (?, ?)
	`);

	for (const tag of media.tags || []) {
		insertTag.run({
			id:               tag.id,
			name:             tag.name,
			description:      tag.description,
			category:         tag.category,
			rank:             tag.rank,
			isGeneralSpoiler: tag.isGeneralSpoiler ? 1 : 0,
			isMediaSpoiler:   tag.isMediaSpoiler ? 1 : 0,
		});

		insertMediaTag.run(
			mediaId,
			tag.id,
		);
	}
}
