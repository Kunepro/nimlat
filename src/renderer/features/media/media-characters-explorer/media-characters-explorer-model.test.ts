import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildVoiceActorLanguageOptions,
	DEFAULT_VOICE_ACTOR_LANGUAGE,
	resolveAvailableVoiceActorLanguage,
} from "./media-characters-explorer-model";

function createCharacter(overrides: Partial<MediaCharacterListItem> = {}): MediaCharacterListItem {
	return {
		characterId: 1,
		name:        "Spike Spiegel",
		voiceActors: [],
		...overrides,
	};
}

describe(
	"media-characters-explorer-model",
	() => {
		it(
			"builds sorted voice actor language options with Japanese first",
			() => {
				expect(buildVoiceActorLanguageOptions([
					createCharacter({
						voiceActors: [
							{
								language:          "English",
								hasRenderableData: true,
							},
							{
								language:          null,
								hasRenderableData: false,
							},
						],
					}),
					createCharacter({
						voiceActors: [
							{
								language:          "Italian",
								hasRenderableData: true,
							},
							{
								language:          DEFAULT_VOICE_ACTOR_LANGUAGE,
								hasRenderableData: true,
							},
						],
					}),
				])).toEqual([
					{
						label: DEFAULT_VOICE_ACTOR_LANGUAGE,
						value: DEFAULT_VOICE_ACTOR_LANGUAGE,
					},
					{
						label: "English",
						value: "English",
					},
					{
						label: "Italian",
						value: "Italian",
					},
				]);
			},
		);

		it(
			"falls back to the default language when the current choice disappears",
			() => {
				const options = buildVoiceActorLanguageOptions([
					createCharacter({
						voiceActors: [
							{
								language:          "English",
								hasRenderableData: true,
							},
						],
					}),
				]);

				expect(resolveAvailableVoiceActorLanguage(
					"English",
					options,
				)).toBe("English");
				expect(resolveAvailableVoiceActorLanguage(
					"Italian",
					options,
				)).toBe(DEFAULT_VOICE_ACTOR_LANGUAGE);
			},
		);
	},
);
