import type { CharacterRole } from "@nimlat/types/ani-list-media-api";
import type {
	CharacterInspectionData,
	CharacterMediaCard,
	CharacterVoiceActorCredit,
	CharacterVoiceActorMediaCredit,
} from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";
import { resolveCharacterImageUrl } from "./character-image";

export type CharacterInspectionCharacterRow = {
	characterId: number;
	imageJson: string | null;
	nameFull: string | null;
	nameNative: string | null;
	role: CharacterRole | null;
};

export type CharacterInspectionMediaRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	format: string | null;
	mediaId: number;
	name: string | null;
	nameJapanese: string | null;
	nameRomanji: string | null;
	role: CharacterRole | null;
};

export type CharacterInspectionVoiceActorRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	format: string | null;
	mediaId: number;
	mediaName: string | null;
	mediaNameJapanese: string | null;
	mediaNameRomanji: string | null;
	role: CharacterRole | null;
	staffId: number;
	voiceActorImageJson: string | null;
	voiceActorLanguage: string | null;
	voiceActorName: string | null;
};

export type CharacterInspectionModelRows = {
	character: CharacterInspectionCharacterRow;
	mediaRows: CharacterInspectionMediaRow[];
	voiceActorRows: CharacterInspectionVoiceActorRow[];
};

function mapCharacterMedia(row: CharacterInspectionMediaRow): CharacterMediaCard {
	return {
		format:   row.format || undefined,
		imageUrl: resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		mediaId:  row.mediaId,
		name:     row.name || row.nameRomanji || row.nameJapanese || `Media ${ row.mediaId }`,
		role:     row.role ?? undefined,
	};
}

function mapVoiceActorMediaCredit(row: CharacterInspectionVoiceActorRow): CharacterVoiceActorMediaCredit {
	return {
		format:        row.format || undefined,
		mediaId:       row.mediaId,
		mediaImageUrl: resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		mediaName:     row.mediaName || row.mediaNameRomanji || row.mediaNameJapanese || `Media ${ row.mediaId }`,
		role:          row.role ?? undefined,
	};
}

export function mapCharacterVoiceActors(rows: CharacterInspectionVoiceActorRow[]): CharacterVoiceActorCredit[] {
	const creditsByStaffId = new Map<number, CharacterVoiceActorCredit>();

	for (const row of rows) {
		const existingCredit = creditsByStaffId.get(row.staffId);
		const credit         = existingCredit ?? {
			appearances: [],
			imageUrl:    resolveCharacterImageUrl(row.voiceActorImageJson),
			language:    row.voiceActorLanguage ?? undefined,
			name:        row.voiceActorName || `Voice actor ${ row.staffId }`,
			staffId:     row.staffId,
		};

		credit.appearances.push(mapVoiceActorMediaCredit(row));
		creditsByStaffId.set(
			row.staffId,
			credit,
		);
	}

	return Array.from(creditsByStaffId.values());
}

export function createCharacterInspectionData({
																								character,
																								mediaRows,
																								voiceActorRows,
																							}: CharacterInspectionModelRows): CharacterInspectionData {
	return {
		characterId: character.characterId,
		imageUrl:    resolveCharacterImageUrl(character.imageJson),
		medias:      mediaRows.map(mapCharacterMedia),
		name:        character.nameFull || character.nameNative || `Character ${ character.characterId }`,
		nameNative:  character.nameNative || undefined,
		role:        character.role ?? undefined,
		voiceActors: mapCharacterVoiceActors(voiceActorRows),
	};
}
