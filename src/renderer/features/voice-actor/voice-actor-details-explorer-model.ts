import type {
	VoiceActorCharacterMediaCard,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import type { InspectionInfoField } from "../../types/components";

export function buildVoiceActorInspectionDescription(voiceActor: VoiceActorInspectionData): string | undefined {
	if (!voiceActor.language) {
		return undefined;
	}

	return `Language: ${ voiceActor.language }`;
}

export function buildVoiceActorInspectionFields(voiceActor: VoiceActorInspectionData): InspectionInfoField[] {
	return [
		{
			label: "Staff ID",
			value: voiceActor.staffId.toString(),
		},
		{
			label: "Character/media credits",
			value: voiceActor.appearances.length.toString(),
		},
	];
}

export function createVoiceActorAppearanceKey(appearance: VoiceActorCharacterMediaCard): string {
	return `${ appearance.mediaId }:${ appearance.characterId }`;
}
