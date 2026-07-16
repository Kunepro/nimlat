import { getDatabase } from "../../../utils/get-db";

// Insert a relationship between a media and a character. This legacy helper keeps
// edge metadata empty; hydrated character ingestion owns role and voice actor data.
export function insertMediaCharacter(
	mediaId: number,
	characterId: number,
): void {
	// noinspection SqlResolve
	const insertMediaCharacter = getDatabase().prepare(`
      INSERT OR IGNORE INTO anime_data.mediaCharacters
          (mediaId, characterId)
      VALUES (?, ?)
	`);

	insertMediaCharacter.run(
		mediaId,
		characterId,
	);
}


