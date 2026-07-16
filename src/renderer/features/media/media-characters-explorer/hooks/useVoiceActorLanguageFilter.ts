import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import {
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	buildVoiceActorLanguageOptions,
	DEFAULT_VOICE_ACTOR_LANGUAGE,
	resolveAvailableVoiceActorLanguage,
} from "../media-characters-explorer-model";

export function useVoiceActorLanguageFilter(characters: MediaCharacterListItem[]) {
	const [ voiceActorLanguage, setVoiceActorLanguage ] = useState(DEFAULT_VOICE_ACTOR_LANGUAGE);
	const voiceActorLanguageOptions                     = useMemo(
		() => buildVoiceActorLanguageOptions(characters),
		[ characters ],
	);

	useEffect(
		() => {
			const nextLanguage = resolveAvailableVoiceActorLanguage(
				voiceActorLanguage,
				voiceActorLanguageOptions,
			);
			if (nextLanguage !== voiceActorLanguage) {
				setVoiceActorLanguage(nextLanguage);
			}
		},
		[
			voiceActorLanguage,
			voiceActorLanguageOptions,
		],
	);

	return {
		voiceActorLanguage,
		voiceActorLanguageOptions,
		setVoiceActorLanguage,
	};
}
