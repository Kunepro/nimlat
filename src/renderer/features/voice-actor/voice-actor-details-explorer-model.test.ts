import type { VoiceActorInspectionData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildVoiceActorInspectionDescription,
	buildVoiceActorInspectionFields,
	createVoiceActorAppearanceKey,
} from "./voice-actor-details-explorer-model";

function createVoiceActor(overrides: Partial<VoiceActorInspectionData> = {}): VoiceActorInspectionData {
	return {
		staffId:     15,
		name:        "Megumi Hayashibara",
		appearances: [],
		...overrides,
	};
}

describe(
	"voice-actor-details-explorer-model",
	() => {
		it(
			"builds the optional language description",
			() => {
				expect(buildVoiceActorInspectionDescription(createVoiceActor({ language: "Japanese" }))).toBe("Language: Japanese");
				expect(buildVoiceActorInspectionDescription(createVoiceActor())).toBeUndefined();
			},
		);

		it(
			"builds voice actor inspection fields from local counts",
			() => {
				expect(buildVoiceActorInspectionFields(createVoiceActor({
					appearances: [
						{
							characterId:   7,
							characterName: "Faye Valentine",
							mediaId:       1,
							mediaName:     "Cowboy Bebop",
						},
						{
							characterId:   8,
							characterName: "Ai Haibara",
							mediaId:       2,
							mediaName:     "Detective Conan",
						},
					],
				}))).toEqual([
					{
						label: "Staff ID",
						value: "15",
					},
					{
						label: "Character/media credits",
						value: "2",
					},
				]);
			},
		);

		it(
			"creates stable appearance keys",
			() => {
				expect(createVoiceActorAppearanceKey({
					characterId:   7,
					characterName: "Faye Valentine",
					mediaId:       1,
					mediaName:     "Cowboy Bebop",
				})).toBe("1:7");
			},
		);
	},
);
