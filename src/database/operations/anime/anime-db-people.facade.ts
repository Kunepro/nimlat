import {
	AniListCharacter,
	StaffEdge,
} from "@nimlat/types/ani-list-media-api";
import {
	CharacterInspectionData,
	StaffInspectionData,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { insertCharacter } from "./characters/insert-character";
import { insertMediaCharacter } from "./characters/insert-media-character";
import { selectCharacterInspectionById } from "./characters/select-character-inspection-by-id";
import { selectVoiceActorInspectionById } from "./characters/select-voice-actor-inspection-by-id";
import { upsertMediaCharactersBatch } from "./characters/upsert-media-characters-batch";
import { selectStaffInspectionById } from "./staff/select-staff-inspection-by-id";
import { upsertMediaStaffBatch } from "./staff/upsert-media-staff-batch";

// People facade panel for character/staff hydration and inspection read models.
export const AnimeDbPeopleFacade = {
	processCharactersBatch(
		mediaId: number,
		characters: AniListCharacter[],
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.processCharactersBatch",
			() => upsertMediaCharactersBatch(
				mediaId,
				characters,
			),
			{ mediaId },
		);
	},

	processStaffBatch(
		mediaId: number,
		staffEdges: StaffEdge[],
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.processStaffBatch",
			() => upsertMediaStaffBatch(
				mediaId,
				staffEdges,
			),
			{ mediaId },
		);
	},

	getCharacterInspection(characterId: number): CharacterInspectionData | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.characters.getInspection",
			() => selectCharacterInspectionById(characterId),
			{ characterId },
		);
	},

	getVoiceActorInspection(staffId: number): VoiceActorInspectionData | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.voiceActors.getInspection",
			() => selectVoiceActorInspectionById(staffId),
			{ staffId },
		);
	},

	getStaffInspection(staffId: number): StaffInspectionData | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.staff.getInspection",
			() => selectStaffInspectionById(staffId),
			{ staffId },
		);
	},

	insertCharacter(
		characterId: number,
		nameFull: string,
		nameNative: string | null,
		imageJson: string,
		role: string,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.characters.insertCharacter",
			() => insertCharacter(
				characterId,
				nameFull,
				nameNative,
				imageJson,
				role,
			),
			{ characterId },
		);
	},

	insertMediaCharacter(
		mediaId: number,
		characterId: number,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.characters.insertMediaCharacter",
			() => insertMediaCharacter(
				mediaId,
				characterId,
			),
			{
				mediaId,
				characterId,
			},
		);
	},
} as const;
