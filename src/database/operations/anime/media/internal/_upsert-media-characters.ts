import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { Database } from "better-sqlite3";
import { mapVoiceActorsForStorage } from "../../characters/voice-actor-storage";

export function _upsertMediaCharacters(db: Database, mediaId: number, media: AniListMedia): void {
	// noinspection SqlResolve
	const insertCharacter      = db.prepare(`
      INSERT OR
      REPLACE
      INTO anime_data.characters
          (id, nameFull, nameNative, imageJson)
      VALUES (@id, @nameFull, @nameNative, @imageJson)
	`);
	// noinspection SqlResolve
	const insertMediaCharacter = db.prepare(`
      INSERT INTO anime_data.mediaCharacters
          (mediaId, characterId, role)
      VALUES (@mediaId, @characterId, @role)
      ON CONFLICT(mediaId, characterId) DO UPDATE SET
          role = excluded.role
	`);
	// noinspection SqlResolve
	const deleteMediaCharacterVoiceActors = db.prepare(`
      DELETE FROM anime_data.mediaCharacterVoiceActors
      WHERE mediaId = ?
        AND characterId = ?
	`);
	// noinspection SqlResolve
	const insertMediaCharacterVoiceActor = db.prepare(`
      INSERT INTO anime_data.mediaCharacterVoiceActors
          (mediaId, characterId, voiceActorId, voiceActorName, voiceActorLanguage, voiceActorImageJson, sortOrder)
      VALUES (@mediaId, @characterId, @voiceActorId, @voiceActorName, @voiceActorLanguage, @voiceActorImageJson, @sortOrder)
      ON CONFLICT(mediaId, characterId, voiceActorId, voiceActorLanguage) DO UPDATE SET
          voiceActorName = excluded.voiceActorName,
          voiceActorImageJson = excluded.voiceActorImageJson,
          sortOrder = excluded.sortOrder
	`);

	for (const edge of media.characters?.edges || []) {
		const node = edge.node;

		insertCharacter.run({
			id:         node.id,
			nameFull:   node.name.full,
			nameNative: node.name.native,
			imageJson:  JSON.stringify(node.image),
		});

		insertMediaCharacter.run({
			mediaId,
			characterId: node.id,
			role:        edge.role ?? null,
		});
		deleteMediaCharacterVoiceActors.run(
			mediaId,
			node.id,
		);
		for (const voiceActorFields of mapVoiceActorsForStorage(edge.voiceActors)) {
			insertMediaCharacterVoiceActor.run({
				mediaId,
				characterId: node.id,
				...voiceActorFields,
			});
		}
	}
}
