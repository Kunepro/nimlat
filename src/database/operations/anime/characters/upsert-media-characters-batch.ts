import { AniListCharacter } from "@nimlat/types/ani-list-media-api";
import { getDatabase } from "../../../utils/get-db";
import { mapVoiceActorsForStorage } from "./voice-actor-storage";

// Upsert characters and their medias relations in a single transaction.
// Role and multilingual voice actors are media-specific edge data, so they are
// refreshed separately from global character identity.
export function upsertMediaCharactersBatch(mediaId: number, characters: AniListCharacter[]): void {
	const db = getDatabase();

	// noinspection SqlResolve
	const insertCharacterStmt = db.prepare(`
      INSERT OR
      REPLACE
      INTO anime_data.characters
          (id, nameFull, nameNative, imageJson, role)
      VALUES (?, ?, ?, ?, ?)
	`);

	// noinspection SqlResolve
	const insertMediaCharacterStmt = db.prepare(`
      INSERT INTO anime_data.mediaCharacters
          (mediaId, characterId, role)
      VALUES (@mediaId, @characterId, @role)
      ON CONFLICT(mediaId, characterId) DO UPDATE SET
          role = excluded.role
	`);

	// noinspection SqlResolve
	const deleteVoiceActorsStmt = db.prepare(`
      DELETE FROM anime_data.mediaCharacterVoiceActors
      WHERE mediaId = ?
        AND characterId = ?
	`);

	// noinspection SqlResolve
	const insertVoiceActorStmt = db.prepare(`
      INSERT INTO anime_data.mediaCharacterVoiceActors
          (mediaId, characterId, voiceActorId, voiceActorName, voiceActorLanguage, voiceActorImageJson, sortOrder)
      VALUES (@mediaId, @characterId, @voiceActorId, @voiceActorName, @voiceActorLanguage, @voiceActorImageJson, @sortOrder)
      ON CONFLICT(mediaId, characterId, voiceActorId, voiceActorLanguage) DO UPDATE SET
          voiceActorName = excluded.voiceActorName,
          voiceActorImageJson = excluded.voiceActorImageJson,
          sortOrder = excluded.sortOrder
	`);

	const upsertMediaCharactersBatch = db.transaction((items: AniListCharacter[]) => {
		for (const character of items) {
			const nameFull = character.name.full || character.name.native || `Character ${ character.id }`;
			insertCharacterStmt.run(
				character.id,
				nameFull,
				character.name.native ?? null,
				JSON.stringify(character.image ?? null),
				character.role ?? null,
			);
			insertMediaCharacterStmt.run({
				mediaId,
				characterId: character.id,
				role:        character.role ?? null,
			});
			deleteVoiceActorsStmt.run(
				mediaId,
				character.id,
			);
			for (const voiceActorFields of mapVoiceActorsForStorage(character.voiceActors)) {
				insertVoiceActorStmt.run({
					mediaId,
					characterId: character.id,
					...voiceActorFields,
				});
			}
		}
	});

	upsertMediaCharactersBatch(characters);
}
