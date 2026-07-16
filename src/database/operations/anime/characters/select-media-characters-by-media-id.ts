import type { CharacterRole } from "@nimlat/types/ani-list-media-api";
import {
	MediaCharacterListItem,
	MediaCharacterVoiceActor,
} from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { resolveCharacterImageUrl } from "./character-image";

type CharacterRow = {
	characterId: number;
	nameFull: string | null;
	nameNative: string | null;
	imageJson: string | null;
	role: CharacterRole | null;
};

type VoiceActorRow = {
	characterId: number;
	voiceActorId: number | null;
	voiceActorName: string | null;
	voiceActorLanguage: string | null;
	voiceActorImageJson: string | null;
};

// noinspection SqlResolve
const STMT_MEDIA_CHARACTERS = sql`
    SELECT characters.id AS characterId,
           characters.nameFull,
           characters.nameNative,
           characters.imageJson,
           COALESCE(mediaCharacters.role, characters.role) AS role
    FROM anime_data.mediaCharacters mediaCharacters
             INNER JOIN anime_data.characters characters
                        ON characters.id = mediaCharacters.characterId
    WHERE mediaCharacters.mediaId = ?
    ORDER BY CASE COALESCE(mediaCharacters.role, characters.role)
                 WHEN 'MAIN' THEN 0
                 WHEN 'SUPPORTING' THEN 1
                 WHEN 'BACKGROUND' THEN 2
                 WHEN 'EXTRA' THEN 3
                 ELSE 4
                 END,
             characters.nameFull COLLATE NOCASE ASC,
             characters.id ASC
`;

// noinspection SqlResolve
const STMT_MEDIA_CHARACTER_VOICE_ACTORS = sql`
    SELECT voiceActors.characterId,
           voiceActors.voiceActorId,
           voiceActors.voiceActorName,
           voiceActors.voiceActorLanguage,
           voiceActors.voiceActorImageJson
    FROM anime_data.mediaCharacterVoiceActors voiceActors
    WHERE voiceActors.mediaId = ?
    ORDER BY voiceActors.characterId ASC,
             CASE voiceActors.voiceActorLanguage WHEN 'Japanese' THEN 0 ELSE 1 END,
             voiceActors.voiceActorLanguage COLLATE NOCASE ASC,
             voiceActors.sortOrder ASC,
             voiceActors.voiceActorName COLLATE NOCASE ASC,
             voiceActors.voiceActorId ASC
`;

function mapVoiceActor(row: VoiceActorRow): MediaCharacterVoiceActor {
	const imageUrl = resolveCharacterImageUrl(row.voiceActorImageJson);

	return {
		staffId:           row.voiceActorId ?? undefined,
		name:              row.voiceActorName || undefined,
		imageUrl,
		language:          row.voiceActorLanguage ?? undefined,
		hasRenderableData: Boolean(row.voiceActorName || imageUrl),
	};
}

export function selectMediaCharactersByMediaId(mediaId: number): MediaCharacterListItem[] {
	const rows = getDatabase()
		.prepare(STMT_MEDIA_CHARACTERS)
		.all(mediaId) as CharacterRow[];
	const voiceActorRows = getDatabase()
		.prepare(STMT_MEDIA_CHARACTER_VOICE_ACTORS)
		.all(mediaId) as VoiceActorRow[];
	const voiceActorsByCharacterId = new Map<number, MediaCharacterVoiceActor[]>();

	for (const row of voiceActorRows) {
		const voiceActors = voiceActorsByCharacterId.get(row.characterId) ?? [];
		voiceActors.push(mapVoiceActor(row));
		voiceActorsByCharacterId.set(
			row.characterId,
			voiceActors,
		);
	}

	return rows.map((row): MediaCharacterListItem => {
		return {
			characterId: row.characterId,
			name:        row.nameFull || row.nameNative || `Character ${ row.characterId }`,
			nameNative:  row.nameNative || undefined,
			imageUrl:    resolveCharacterImageUrl(row.imageJson),
			role:        row.role ?? undefined,
			voiceActors: voiceActorsByCharacterId.get(row.characterId) ?? [],
		};
	});
}
