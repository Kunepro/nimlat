import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	areCharacterCardPropsEqual,
	getCharacterCardFallbackInitial,
	resolveCharacterCardDisplay,
	resolveCharacterCardPresentation,
	resolvePrimaryCharacterVoiceActor,
} from "./character-card-model";

function createCharacter(overrides: Partial<MediaCharacterListItem> = {}): MediaCharacterListItem {
	return {
		characterId: 1,
		name:        "Spike Spiegel",
		nameNative:  "スパイク・スピーゲル",
		imageUrl:    "character.jpg",
		role:        "MAIN",
		voiceActors: [
			{
				staffId:           11,
				name:              "Absent Actor",
				language:          "Japanese",
				hasRenderableData: false,
			},
			{
				staffId:           12,
				name:              "Koichi Yamadera",
				imageUrl:          "actor.jpg",
				language:          "Japanese",
				hasRenderableData: true,
			},
		],
		...overrides,
	};
}

describe(
	"character-card-model",
	() => {
		it(
			"selects the renderable voice actor for the requested language",
			() => {
				expect(resolvePrimaryCharacterVoiceActor(
					createCharacter(),
					"Japanese",
				)?.staffId).toBe(12);
				expect(resolvePrimaryCharacterVoiceActor(
					createCharacter(),
					"English",
				)).toBeUndefined();
			},
		);

		it(
			"resolves character and voice actor display states",
			() => {
				expect(resolveCharacterCardDisplay(
					createCharacter(),
					"character",
					"Japanese",
				)).toEqual({
					name:               "Spike Spiegel",
					secondary:          "スパイク・スピーゲル",
					imageUrl:           "character.jpg",
					isAbsentVoiceActor: false,
				});
				expect(resolveCharacterCardDisplay(
					createCharacter(),
					"voiceActor",
					"Japanese",
				)).toEqual({
					name:               "Koichi Yamadera",
					secondary:          "Japanese",
					imageUrl:           "actor.jpg",
					isAbsentVoiceActor: false,
				});
				expect(resolveCharacterCardDisplay(
					createCharacter(),
					"voiceActor",
					"English",
				)).toEqual({
					name:               "Absent data",
					secondary:          undefined,
					imageUrl:           undefined,
					isAbsentVoiceActor: true,
				});
			},
		);

		it(
			"derives switch presentation and fallback initials",
			() => {
				expect(resolveCharacterCardPresentation(
					createCharacter(),
					"voiceActor",
					"English",
				)).toMatchObject({
					canOpenVoiceActor:     false,
					canSwitchToVoiceActor: false,
					effectiveViewMode:     "character",
					switchDisabled:        true,
					switchLabel:           "Show voice actor",
					switchTitle:           "absent data",
				});
				expect(getCharacterCardFallbackInitial({
					name:               "Faye",
					isAbsentVoiceActor: false,
				})).toBe("F");
				expect(getCharacterCardFallbackInitial({
					name:               "Absent data",
					isAbsentVoiceActor: true,
				})).toBe("?");
			},
		);

		it(
			"compares only render-affecting card props for memo boundaries",
			() => {
				const prev         = {
					character:          createCharacter(),
					voiceActorLanguage: "Japanese",
				};
				const same         = {
					character:          createCharacter(),
					voiceActorLanguage: "Japanese",
				};
				const changedActor = {
					character:          createCharacter({
						voiceActors: [
							{
								staffId:           12,
								name:              "Changed Actor",
								language:          "Japanese",
								hasRenderableData: true,
							},
						],
					}),
					voiceActorLanguage: "Japanese",
				};

				expect(areCharacterCardPropsEqual(
					prev,
					same,
				)).toBe(true);
				expect(areCharacterCardPropsEqual(
					prev,
					changedActor,
				)).toBe(false);
				expect(areCharacterCardPropsEqual(
					prev,
					{
						...same,
						voiceActorLanguage: "English",
					},
				)).toBe(false);
			},
		);
	},
);
