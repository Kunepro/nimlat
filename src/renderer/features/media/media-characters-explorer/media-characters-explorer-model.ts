import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";

export const DEFAULT_VOICE_ACTOR_LANGUAGE = "Japanese";

export interface VoiceActorLanguageOption {
	label: string;
	value: string;
}

export function buildVoiceActorLanguageOptions(characters: MediaCharacterListItem[]): VoiceActorLanguageOption[] {
	const languages = new Set([
		DEFAULT_VOICE_ACTOR_LANGUAGE,
		...characters.flatMap(character => character.voiceActors
			.map(voiceActor => voiceActor.language)
			.filter((language): language is string => Boolean(language))),
	]);

	return Array.from(languages)
		.sort((firstLanguage, secondLanguage) => {
			if (firstLanguage === DEFAULT_VOICE_ACTOR_LANGUAGE) return -1;
			if (secondLanguage === DEFAULT_VOICE_ACTOR_LANGUAGE) return 1;
			return firstLanguage.localeCompare(secondLanguage);
		})
		.map((language) => ({
			label: language,
			value: language,
		}));
}

export function resolveAvailableVoiceActorLanguage(
	currentLanguage: string,
	options: VoiceActorLanguageOption[],
): string {
	return options.some((option) => option.value === currentLanguage)
		? currentLanguage
		: DEFAULT_VOICE_ACTOR_LANGUAGE;
}
