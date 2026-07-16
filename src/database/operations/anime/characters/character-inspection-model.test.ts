// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	type CharacterInspectionCharacterRow,
	type CharacterInspectionMediaRow,
	type CharacterInspectionVoiceActorRow,
	createCharacterInspectionData,
	mapCharacterVoiceActors,
} from "./character-inspection-model";

function createCharacter(overrides: Partial<CharacterInspectionCharacterRow> = {}): CharacterInspectionCharacterRow {
	return {
		characterId: 7,
		imageJson:   "{\"large\":\"character-large.jpg\"}",
		nameFull:    "Faye Valentine",
		nameNative:  null,
		role:        "MAIN",
		...overrides,
	};
}

function createMedia(overrides: Partial<CharacterInspectionMediaRow> = {}): CharacterInspectionMediaRow {
	return {
		bannerImage:    null,
		coverImageJson: "{\"medium\":\"cover.jpg\"}",
		customImageUrl: null,
		format:         "TV",
		mediaId:        42,
		name:           "Cowboy Bebop",
		nameJapanese:   null,
		nameRomanji:    null,
		role:           "MAIN",
		...overrides,
	};
}

function createVoiceActor(overrides: Partial<CharacterInspectionVoiceActorRow> = {}): CharacterInspectionVoiceActorRow {
	return {
		bannerImage:         null,
		coverImageJson:      "{\"large\":\"voice-media.jpg\"}",
		customImageUrl:      null,
		format:              "TV",
		mediaId:             42,
		mediaName:           "Cowboy Bebop",
		mediaNameJapanese:   null,
		mediaNameRomanji:    null,
		role:                "MAIN",
		staffId:             99,
		voiceActorImageJson: "{\"medium\":\"actor.jpg\"}",
		voiceActorLanguage:  "Japanese",
		voiceActorName:      "Megumi Hayashibara",
		...overrides,
	};
}

describe(
	"character inspection model",
	() => {
		it(
			"groups voice actor media appearances by staff id without losing ordered credits",
			() => {
				expect(mapCharacterVoiceActors([
					createVoiceActor({
						mediaId:   42,
						mediaName: "Cowboy Bebop",
					}),
					createVoiceActor({
						mediaId:          43,
						mediaName:        null,
						mediaNameRomanji: "Bebop Movie",
						voiceActorName:   "Megumi Hayashibara",
					}),
					createVoiceActor({
						staffId:             100,
						voiceActorImageJson: null,
						voiceActorLanguage:  null,
						voiceActorName:      null,
					}),
				])).toEqual([
					{
						appearances: [
							{
								format:        "TV",
								mediaId:       42,
								mediaImageUrl: "voice-media.jpg",
								mediaName:     "Cowboy Bebop",
								role:          "MAIN",
							},
							{
								format:        "TV",
								mediaId:       43,
								mediaImageUrl: "voice-media.jpg",
								mediaName:     "Bebop Movie",
								role:          "MAIN",
							},
						],
						imageUrl:    "actor.jpg",
						language:    "Japanese",
						name:        "Megumi Hayashibara",
						staffId:     99,
					},
					{
						appearances: [
							{
								format:        "TV",
								mediaId:       42,
								mediaImageUrl: "voice-media.jpg",
								mediaName:     "Cowboy Bebop",
								role:          "MAIN",
							},
						],
						imageUrl:    undefined,
						language:    undefined,
						name:        "Voice actor 100",
						staffId:     100,
					},
				]);
			},
		);

		it(
			"maps character rows into the renderer-facing inspection payload",
			() => {
				expect(createCharacterInspectionData({
					character:      createCharacter(),
					mediaRows:      [
						createMedia(),
						createMedia({
							bannerImage:    "banner.jpg",
							coverImageJson: "{broken",
							customImageUrl: null,
							mediaId:        43,
							name:           null,
							nameJapanese:   "Native Media",
							role:           null,
						}),
					],
					voiceActorRows: [
						createVoiceActor(),
					],
				})).toEqual({
					characterId: 7,
					imageUrl:    "character-large.jpg",
					medias:      [
						{
							format:   "TV",
							imageUrl: "cover.jpg",
							mediaId:  42,
							name:     "Cowboy Bebop",
							role:     "MAIN",
						},
						{
							format:   "TV",
							imageUrl: "banner.jpg",
							mediaId:  43,
							name:     "Native Media",
							role:     undefined,
						},
					],
					name:        "Faye Valentine",
					nameNative:  undefined,
					role:        "MAIN",
					voiceActors: [
						{
							appearances: [
								{
									format:        "TV",
									mediaId:       42,
									mediaImageUrl: "voice-media.jpg",
									mediaName:     "Cowboy Bebop",
									role:          "MAIN",
								},
							],
							imageUrl:    "actor.jpg",
							language:    "Japanese",
							name:        "Megumi Hayashibara",
							staffId:     99,
						},
					],
				});
			},
		);

		it(
			"falls back missing names to stable ids",
			() => {
				const inspection = createCharacterInspectionData({
					character:      createCharacter({
						characterId: 11,
						imageJson:   null,
						nameFull:    null,
						nameNative:  null,
						role:        null,
					}),
					mediaRows:      [
						createMedia({
							coverImageJson: null,
							mediaId:        12,
							name:           null,
							nameJapanese:   null,
							nameRomanji:    null,
						}),
					],
					voiceActorRows: [],
				});

				expect(inspection.name).toBe("Character 11");
				expect(inspection.imageUrl).toBeUndefined();
				expect(inspection.medias[ 0 ]?.name).toBe("Media 12");
			},
		);
	},
);
