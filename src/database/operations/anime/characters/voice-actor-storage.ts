import { AniListVoiceActor } from "@nimlat/types/ani-list-media-api";

export interface VoiceActorStorageFields {
	voiceActorId: number | null;
	voiceActorName: string | null;
	voiceActorLanguage: string;
	voiceActorImageJson: string | null;
	sortOrder: number;
}

const UNKNOWN_VOICE_ACTOR_LANGUAGE = "Unknown";

// AniList attaches multilingual voice actors to the media-character edge. Store
// each edge credit separately by language so dubs do not overwrite each other.
export function mapVoiceActorsForStorage(voiceActors?: AniListVoiceActor[] | null): VoiceActorStorageFields[] {
	return (voiceActors ?? []).map((voiceActor, index) => ({
		voiceActorId:        voiceActor.id,
		voiceActorName:      resolveVoiceActorName(voiceActor),
		voiceActorLanguage:  resolveVoiceActorLanguage(voiceActor),
		voiceActorImageJson: JSON.stringify(voiceActor.image ?? null),
		sortOrder:           index,
	}));
}

function resolveVoiceActorLanguage(voiceActor: AniListVoiceActor): string {
	return voiceActor.language?.trim() || UNKNOWN_VOICE_ACTOR_LANGUAGE;
}

function resolveVoiceActorName(voiceActor: AniListVoiceActor): string | null {
	if (voiceActor.name.full) {
		return voiceActor.name.full;
	}

	const composedName = [
		voiceActor.name.first,
		voiceActor.name.last,
	]
		.filter((part): part is string => Boolean(part))
		.join(" ")
		.trim();

	return composedName || voiceActor.name.native || null;
}
