import type {
	CharacterInspectionData,
	CharacterMediaCard as CharacterMediaCardData,
	CharacterVoiceActorCredit,
} from "@nimlat/types/ipc-payloads";
import type { InspectionInfoField } from "../../types/components";

export function buildCharacterInspectionDescription(character: CharacterInspectionData): string | undefined {
	if (!character.nameNative) {
		return undefined;
	}

	return `Native name: ${ character.nameNative }`;
}

export function buildCharacterInspectionFields(character: CharacterInspectionData): InspectionInfoField[] {
	return [
		{
			label: "Character ID",
			value: character.characterId.toString(),
		},
		{
			label: "Voice actors",
			value: character.voiceActors.length.toString(),
		},
		{
			label: "Media appearances",
			value: character.medias.length.toString(),
		},
	];
}

export function createCharacterMediaKey(media: CharacterMediaCardData): number {
	return media.mediaId;
}

export function createCharacterVoiceActorKey(voiceActor: CharacterVoiceActorCredit): number {
	return voiceActor.staffId;
}
