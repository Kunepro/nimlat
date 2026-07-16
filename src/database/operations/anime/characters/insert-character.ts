import { getDatabase } from "../../../utils/get-db";

// Insert or replace a character in the anime_data.characters table.
export function insertCharacter(
	characterId: number,
	nameFull: string,
	nameNative: string | null,
	imageJson: string,
	role: string,
): void {
	// noinspection SqlResolve
	const insertCharacter = getDatabase().prepare(`
      INSERT OR
      REPLACE
      INTO anime_data.characters
          (id, nameFull, nameNative, imageJson, role)
      VALUES (?, ?, ?, ?, ?)
	`);

	insertCharacter.run(
		characterId,
		nameFull,
		nameNative,
		imageJson,
		role,
	);
}

