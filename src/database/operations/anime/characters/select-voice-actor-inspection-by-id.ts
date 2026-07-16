import type { VoiceActorInspectionData } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";
import {
	createVoiceActorInspectionData,
	type VoiceActorInspectionAppearanceRow,
	type VoiceActorInspectionVoiceActorRow,
} from "./voice-actor-inspection-model";

const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

// noinspection SqlResolve
const STMT_VOICE_ACTOR = sql`
    SELECT voiceActors.voiceActorId       AS staffId,
           voiceActors.voiceActorName     AS name,
           voiceActors.voiceActorLanguage AS language,
           voiceActors.voiceActorImageJson AS imageJson
    FROM anime_data.mediaCharacterVoiceActors voiceActors
    WHERE voiceActors.voiceActorId = ?
      AND (
        voiceActors.voiceActorName IS NOT NULL
            OR voiceActors.voiceActorImageJson IS NOT NULL
        )
    ORDER BY CASE WHEN voiceActors.voiceActorName IS NOT NULL THEN 0 ELSE 1 END,
             voiceActors.mediaId ASC,
             voiceActors.characterId ASC
    LIMIT 1
`;

// noinspection SqlResolve
const STMT_VOICE_ACTOR_APPEARANCES = sql`
    SELECT characters.id AS characterId,
           characters.nameFull AS characterNameFull,
           characters.nameNative AS characterNameNative,
           characters.imageJson AS characterImageJson,
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
    WHERE voiceActors.voiceActorId = ?
      AND media.isStub = 0
    ORDER BY media.name COLLATE NOCASE ASC,
             characters.nameFull COLLATE NOCASE ASC,
             media.mediaId ASC,
             characters.id ASC
`;

export function selectVoiceActorInspectionById(staffId: number): VoiceActorInspectionData | null {
	const voiceActor = getDatabase()
		.prepare(STMT_VOICE_ACTOR)
		.get(staffId) as VoiceActorInspectionVoiceActorRow | undefined;

	if (!voiceActor) {
		return null;
	}

	const appearances = getDatabase()
		.prepare(STMT_VOICE_ACTOR_APPEARANCES)
		.all(staffId) as VoiceActorInspectionAppearanceRow[];

	return createVoiceActorInspectionData({
		appearances,
		voiceActor,
	});
}
