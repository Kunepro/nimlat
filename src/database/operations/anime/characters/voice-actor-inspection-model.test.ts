// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createVoiceActorInspectionData,
	mapVoiceActorAppearance,
	type VoiceActorInspectionAppearanceRow,
	type VoiceActorInspectionVoiceActorRow,
} from "./voice-actor-inspection-model";

function createVoiceActor(overrides: Partial<VoiceActorInspectionVoiceActorRow> = {}): VoiceActorInspectionVoiceActorRow {
	return {
		imageJson: "{\"large\":\"voice-actor.jpg\"}",
		language:  "Japanese",
		name:      "Megumi Hayashibara",
		staffId:   99,
		...overrides,
	};
}

function createAppearance(overrides: Partial<VoiceActorInspectionAppearanceRow> = {}): VoiceActorInspectionAppearanceRow {
	return {
		bannerImage:         null,
		characterId:         7,
		characterImageJson:  "{\"medium\":\"character.jpg\"}",
		characterNameFull:   "Faye Valentine",
		characterNameNative: null,
		coverImageJson:      "{\"extraLarge\":\"media.jpg\"}",
		customImageUrl:      null,
		format:              "TV",
		mediaId:             42,
		mediaName:           "Cowboy Bebop",
		mediaNameJapanese:   null,
		mediaNameRomanji:    null,
		role:                "MAIN",
		...overrides,
	};
}

describe(
	"voice actor inspection model",
	() => {
		it(
			"maps an appearance with media and character fallback images",
			() => {
				expect(mapVoiceActorAppearance(createAppearance())).toEqual({
					characterId:       7,
					characterImageUrl: "character.jpg",
					characterName:     "Faye Valentine",
					format:            "TV",
					mediaId:           42,
					mediaImageUrl:     "media.jpg",
					mediaName:         "Cowboy Bebop",
					role:              "MAIN",
				});
			},
		);

		it(
			"falls back missing appearance names and broken media cover JSON safely",
			() => {
				expect(mapVoiceActorAppearance(createAppearance({
					bannerImage:         "banner.jpg",
					characterId:         8,
					characterImageJson:  null,
					characterNameFull:   null,
					characterNameNative: null,
					coverImageJson:      "{broken",
					mediaId:             12,
					mediaName:           null,
					mediaNameJapanese:   null,
					mediaNameRomanji:    null,
					role:                null,
				}))).toEqual({
					characterId:       8,
					characterImageUrl: undefined,
					characterName:     "Character 8",
					format:            "TV",
					mediaId:           12,
					mediaImageUrl:     "banner.jpg",
					mediaName:         "Media 12",
					role:              undefined,
				});
			},
		);

		it(
			"creates the renderer-facing voice actor inspection payload",
			() => {
				expect(createVoiceActorInspectionData({
					appearances: [
						createAppearance(),
					],
					voiceActor:  createVoiceActor(),
				})).toEqual({
					appearances: [
						{
							characterId:       7,
							characterImageUrl: "character.jpg",
							characterName:     "Faye Valentine",
							format:            "TV",
							mediaId:           42,
							mediaImageUrl:     "media.jpg",
							mediaName:         "Cowboy Bebop",
							role:              "MAIN",
						},
					],
					imageUrl:    "voice-actor.jpg",
					language:    "Japanese",
					name:        "Megumi Hayashibara",
					staffId:     99,
				});
			},
		);

		it(
			"falls back missing voice actor identity to a stable label",
			() => {
				const inspection = createVoiceActorInspectionData({
					appearances: [],
					voiceActor:  createVoiceActor({
						imageJson: null,
						language:  null,
						name:      null,
						staffId:   100,
					}),
				});

				expect(inspection).toEqual({
					appearances: [],
					imageUrl:    undefined,
					language:    undefined,
					name:        "Voice actor 100",
					staffId:     100,
				});
			},
		);
	},
);
