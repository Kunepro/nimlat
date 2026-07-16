import type { CharacterRole } from "@nimlat/types/ani-list-media-api";
import type {
	VoiceActorCharacterMediaCard,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";
import { resolveCharacterImageUrl } from "./character-image";

export type VoiceActorInspectionVoiceActorRow = {
	imageJson: string | null;
	language: string | null;
	name: string | null;
	staffId: number;
};

export type VoiceActorInspectionAppearanceRow = {
	bannerImage: string | null;
	characterId: number;
	characterImageJson: string | null;
	characterNameFull: string | null;
	characterNameNative: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	format: string | null;
	mediaId: number;
	mediaName: string | null;
	mediaNameJapanese: string | null;
	mediaNameRomanji: string | null;
	role: CharacterRole | null;
};

export type VoiceActorInspectionModelRows = {
	appearances: VoiceActorInspectionAppearanceRow[];
	voiceActor: VoiceActorInspectionVoiceActorRow;
};

export function mapVoiceActorAppearance(row: VoiceActorInspectionAppearanceRow): VoiceActorCharacterMediaCard {
	return {
		characterId:       row.characterId,
		characterImageUrl: resolveCharacterImageUrl(row.characterImageJson),
		characterName:     row.characterNameFull || row.characterNameNative || `Character ${ row.characterId }`,
		format:            row.format || undefined,
		mediaId:           row.mediaId,
		mediaImageUrl:     resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		mediaName:         row.mediaName || row.mediaNameRomanji || row.mediaNameJapanese || `Media ${ row.mediaId }`,
		role:              row.role ?? undefined,
	};
}

export function createVoiceActorInspectionData({
																								 appearances,
																								 voiceActor,
																							 }: VoiceActorInspectionModelRows): VoiceActorInspectionData {
	return {
		appearances: appearances.map(mapVoiceActorAppearance),
		imageUrl:    resolveCharacterImageUrl(voiceActor.imageJson),
		language:    voiceActor.language ?? undefined,
		name:        voiceActor.name || `Voice actor ${ voiceActor.staffId }`,
		staffId:     voiceActor.staffId,
	};
}
