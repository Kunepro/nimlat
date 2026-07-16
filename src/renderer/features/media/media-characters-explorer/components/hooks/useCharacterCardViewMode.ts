import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type CharacterCardPresentation,
	type MediaCharacterViewMode,
	resolveCharacterCardPresentation,
} from "../character-card-model";

interface CharacterCardViewModeController extends CharacterCardPresentation {
	toggleViewMode: () => void;
}

export function useCharacterCardViewMode(
	character: MediaCharacterListItem,
	voiceActorLanguage: string,
): CharacterCardViewModeController {
	const [ viewMode, setViewMode ] = useState<MediaCharacterViewMode>("character");
	const presentation              = useMemo(
		() => resolveCharacterCardPresentation(
			character,
			viewMode,
			voiceActorLanguage,
		),
		[
			character,
			viewMode,
			voiceActorLanguage,
		],
	);

	useEffect(
		() => {
			// Language changes can invalidate the visible VA for only this card.
			// Snap back to character mode so absent-data state is expressed by
			// the disabled switch, not by replacing the whole card content.
			if (viewMode === "voiceActor" && !presentation.canSwitchToVoiceActor) {
				setViewMode("character");
			}
		},
		[
			presentation.canSwitchToVoiceActor,
			viewMode,
		],
	);

	const toggleViewMode = useCallback(
		() => {
			if (presentation.switchDisabled) {
				return;
			}

			setViewMode(currentViewMode => currentViewMode === "character" ? "voiceActor" : "character");
		},
		[ presentation.switchDisabled ],
	);

	return {
		...presentation,
		toggleViewMode,
	};
}
