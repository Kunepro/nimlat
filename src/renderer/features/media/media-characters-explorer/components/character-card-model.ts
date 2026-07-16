import type {
	MediaCharacterListItem,
	MediaCharacterVoiceActor,
} from "@nimlat/types/ipc-payloads";

export type MediaCharacterViewMode = "character" | "voiceActor";

export interface CharacterCardProps {
	character: MediaCharacterListItem;
	voiceActorLanguage: string;
}

export interface CharacterCardDisplay {
	imageUrl?: string;
	isAbsentVoiceActor: boolean;
	name: string;
	secondary?: string;
}

export interface CharacterCardPresentation {
	canOpenVoiceActor: boolean;
	canSwitchToVoiceActor: boolean;
	display: CharacterCardDisplay;
	effectiveViewMode: MediaCharacterViewMode;
	primaryVoiceActor?: MediaCharacterVoiceActor;
	switchDisabled: boolean;
	switchLabel: string;
	switchTitle: string;
}

export function resolvePrimaryCharacterVoiceActor(
	character: MediaCharacterListItem,
	voiceActorLanguage: string,
): MediaCharacterVoiceActor | undefined {
	const languageVoiceActors = character.voiceActors.filter((voiceActor) => voiceActor.language === voiceActorLanguage);
	return languageVoiceActors.find((voiceActor) => voiceActor.hasRenderableData) ?? languageVoiceActors[ 0 ];
}

export function resolveCharacterCardDisplay(
	character: MediaCharacterListItem,
	viewMode: MediaCharacterViewMode,
	voiceActorLanguage: string,
): CharacterCardDisplay {
	if (viewMode === "character") {
		return {
			name:               character.name,
			secondary:          character.nameNative,
			imageUrl:           character.imageUrl,
			isAbsentVoiceActor: false,
		};
	}

	const voiceActor   = resolvePrimaryCharacterVoiceActor(
		character,
		voiceActorLanguage,
	);
	const actorHasData = Boolean(voiceActor?.hasRenderableData);

	return {
		name:               actorHasData
													? voiceActor?.name || `Voice actor ${ voiceActor?.staffId ?? character.characterId }`
													: "Absent data",
		secondary:          actorHasData ? voiceActor?.language || undefined : undefined,
		imageUrl:           actorHasData ? voiceActor?.imageUrl : undefined,
		isAbsentVoiceActor: !actorHasData,
	};
}

export function resolveCharacterCardPresentation(
	character: MediaCharacterListItem,
	viewMode: MediaCharacterViewMode,
	voiceActorLanguage: string,
): CharacterCardPresentation {
	const primaryVoiceActor     = resolvePrimaryCharacterVoiceActor(
		character,
		voiceActorLanguage,
	);
	const canSwitchToVoiceActor = Boolean(primaryVoiceActor?.hasRenderableData);
	const effectiveViewMode     = viewMode === "voiceActor" && !canSwitchToVoiceActor
		? "character"
		: viewMode;
	const display               = resolveCharacterCardDisplay(
		character,
		effectiveViewMode,
		voiceActorLanguage,
	);
	const switchLabel           = effectiveViewMode === "character" ? "Show voice actor" : "Show character";
	const switchDisabled        = !canSwitchToVoiceActor;

	return {
		canOpenVoiceActor: typeof primaryVoiceActor?.staffId === "number",
		canSwitchToVoiceActor,
		display,
		effectiveViewMode,
		primaryVoiceActor,
		switchDisabled,
		switchLabel,
		switchTitle:       switchDisabled ? "absent data" : switchLabel,
	};
}

export function getCharacterCardFallbackInitial(display: CharacterCardDisplay): string {
	return display.isAbsentVoiceActor
		? "?"
		: display.name.slice(
			0,
			1,
		).toUpperCase();
}

export function areCharacterCardPropsEqual(prevProps: CharacterCardProps, nextProps: CharacterCardProps): boolean {
	return prevProps.character.characterId === nextProps.character.characterId
		&& prevProps.character.name === nextProps.character.name
		&& prevProps.character.nameNative === nextProps.character.nameNative
		&& prevProps.character.imageUrl === nextProps.character.imageUrl
		&& prevProps.character.role === nextProps.character.role
		&& prevProps.character.voiceActors.length === nextProps.character.voiceActors.length
		&& prevProps.character.voiceActors.every((voiceActor, index) => {
			const nextVoiceActor = nextProps.character.voiceActors[ index ];
			return voiceActor.staffId === nextVoiceActor?.staffId
				&& voiceActor.name === nextVoiceActor?.name
				&& voiceActor.imageUrl === nextVoiceActor?.imageUrl
				&& voiceActor.language === nextVoiceActor?.language
				&& voiceActor.hasRenderableData === nextVoiceActor?.hasRenderableData;
		})
		&& prevProps.voiceActorLanguage === nextProps.voiceActorLanguage;
}
