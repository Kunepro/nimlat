import type { CharacterInspectionData } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";
import {
	type CharacterInspectionCharacterRow,
	type CharacterInspectionMediaRow,
	type CharacterInspectionVoiceActorRow,
	createCharacterInspectionData,
} from "./character-inspection-model";

const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

// noinspection SqlResolve
const STMT_CHARACTER = sql`
    SELECT characters.id AS characterId,
           characters.nameFull,
           characters.nameNative,
           characters.imageJson,
           characters.role
    FROM anime_data.characters characters
    WHERE characters.id = ?
`;

// noinspection SqlResolve
const STMT_CHARACTER_MEDIAS = sql`
    SELECT media.mediaId,
           COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS name,
           media.nameRomanji,
           media.nameJapanese,
           media.format,
           media.coverImageJson,
           media.bannerImage,
           media.customImageUrl,
           COALESCE(mediaCharacters.role, characters.role) AS role
    FROM anime_data.mediaCharacters mediaCharacters
             INNER JOIN anime_data.media media
                        ON media.mediaId = mediaCharacters.mediaId
             INNER JOIN anime_data.characters characters
                        ON characters.id = mediaCharacters.characterId
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
    WHERE mediaCharacters.characterId = ?
      AND media.isStub = 0
    ORDER BY media.name COLLATE NOCASE ASC,
             media.mediaId ASC
`;

// noinspection SqlResolve
const STMT_CHARACTER_VOICE_ACTORS = sql`
    SELECT voiceActors.voiceActorId AS staffId,
           voiceActors.voiceActorName,
           voiceActors.voiceActorLanguage,
           voiceActors.voiceActorImageJson,
           media.mediaId,
           COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS mediaName,
           media.nameRomanji AS mediaNameRomanji,
           media.nameJapanese AS mediaNameJapanese,
           media.format,
           media.coverImageJson,
           media.bannerImage,
           media.customImageUrl,
           COALESCE(mediaCharacters.role, characters.role) AS role
    FROM anime_data.mediaCharacterVoiceActors voiceActors
             INNER JOIN anime_data.mediaCharacters mediaCharacters
                        ON mediaCharacters.mediaId = voiceActors.mediaId
                            AND mediaCharacters.characterId = voiceActors.characterId
             INNER JOIN anime_data.characters characters
                        ON characters.id = voiceActors.characterId
             INNER JOIN anime_data.media media
                        ON media.mediaId = voiceActors.mediaId
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
    WHERE voiceActors.characterId = ?
      AND media.isStub = 0
    ORDER BY CASE voiceActors.voiceActorLanguage WHEN 'Japanese' THEN 0 ELSE 1 END,
             voiceActors.voiceActorLanguage COLLATE NOCASE ASC,
             voiceActors.sortOrder ASC,
             voiceActors.voiceActorName COLLATE NOCASE ASC,
             media.name COLLATE NOCASE ASC,
             media.mediaId ASC
`;

export function selectCharacterInspectionById(characterId: number): CharacterInspectionData | null {
	const character = getDatabase()
		.prepare(STMT_CHARACTER)
		.get(characterId) as CharacterInspectionCharacterRow | undefined;

	if (!character) {
		return null;
	}

	const mediaRows = getDatabase()
		.prepare(STMT_CHARACTER_MEDIAS)
		.all(characterId) as CharacterInspectionMediaRow[];
	const voiceActorRows = getDatabase()
		.prepare(STMT_CHARACTER_VOICE_ACTORS)
		.all(characterId) as CharacterInspectionVoiceActorRow[];

	return createCharacterInspectionData({
		character,
		mediaRows,
		voiceActorRows,
	});
}
