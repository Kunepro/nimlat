import type { CharacterInspectionData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildCharacterInspectionDescription,
	buildCharacterInspectionFields,
	createCharacterMediaKey,
	createCharacterVoiceActorKey,
} from "./character-details-explorer-model";

function createCharacter(overrides: Partial<CharacterInspectionData> = {}): CharacterInspectionData {
	return {
		characterId: 7,
		name:        "Faye Valentine",
		medias:      [],
		voiceActors: [],
		...overrides,
	};
}

describe(
	"character-details-explorer-model",
	() => {
		it(
			"builds the optional native-name description",
			() => {
				expect(buildCharacterInspectionDescription(createCharacter({ nameNative: "Faye" }))).toBe("Native name: Faye");
				expect(buildCharacterInspectionDescription(createCharacter())).toBeUndefined();
			},
		);

		it(
			"builds character inspection fields from local counts",
			() => {
				expect(buildCharacterInspectionFields(createCharacter({
					medias:      [
						{
							mediaId: 1,
							name:    "Cowboy Bebop",
						},
						{
							mediaId: 2,
							name:    "Cowboy Bebop: The Movie",
						},
					],
					voiceActors: [
						{
							staffId:     10,
							name:        "Megumi Hayashibara",
							appearances: [],
						},
					],
				}))).toEqual([
					{
						label: "Character ID",
						value: "7",
					},
					{
						label: "Voice actors",
						value: "1",
					},
					{
						label: "Media appearances",
						value: "2",
					},
				]);
			},
		);

		it(
			"creates stable list keys for appearances and voice actors",
			() => {
				expect(createCharacterMediaKey({
					mediaId: 12,
					name:    "Cowboy Bebop",
				})).toBe(12);
				expect(createCharacterVoiceActorKey({
					staffId:     15,
					name:        "Megumi Hayashibara",
					appearances: [],
				})).toBe(15);
			},
		);
	},
);
