import type { CharacterRole } from "./ani-list-media-api";
import type { ResolvedImageSource } from "./anime-db-images";
import type { MediaId } from "./nimlat-ids";

export interface MediaCharacterListItem {
	characterId: number;
	name: string;
	nameNative?: string;
	imageUrl?: string;
	role?: CharacterRole | null;
	voiceActors: MediaCharacterVoiceActor[];
}

export interface MediaCharacterVoiceActor {
	staffId?: number;
	name?: string;
	imageUrl?: string;
	language?: string | null;
	hasRenderableData: boolean;
}

export interface CharacterMediaCard {
	mediaId: MediaId;
	name: string;
	format?: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
	role?: CharacterRole | null;
}

export interface CharacterVoiceActorMediaCredit {
	mediaId: MediaId;
	mediaName: string;
	format?: string;
	mediaImageUrl?: string;
	displayMediaImageUrl?: string;
	displayMediaImageSource?: ResolvedImageSource;
	role?: CharacterRole | null;
}

export interface CharacterVoiceActorCredit {
	staffId: number;
	name: string;
	imageUrl?: string;
	language?: string | null;
	appearances: CharacterVoiceActorMediaCredit[];
}

export interface CharacterInspectionData {
	characterId: number;
	name: string;
	nameNative?: string;
	imageUrl?: string;
	role?: CharacterRole | null;
	medias: CharacterMediaCard[];
	voiceActors: CharacterVoiceActorCredit[];
}

export interface VoiceActorCharacterMediaCard {
	characterId: number;
	characterName: string;
	characterImageUrl?: string;
	mediaId: MediaId;
	mediaName: string;
	format?: string;
	mediaImageUrl?: string;
	displayMediaImageUrl?: string;
	displayMediaImageSource?: ResolvedImageSource;
	role?: CharacterRole | null;
}

export interface VoiceActorInspectionData {
	staffId: number;
	name: string;
	imageUrl?: string;
	language?: string | null;
	appearances: VoiceActorCharacterMediaCard[];
}

export interface MediaStaffListItem {
	staffId: number;
	name: string;
	nameNative?: string;
	imageUrl?: string;
	language?: string | null;
	role?: string | null;
	primaryOccupations: string[];
	siteUrl?: string | null;
}

export interface StaffMediaCreditCard {
	mediaId: MediaId;
	mediaName: string;
	format?: string;
	mediaImageUrl?: string;
	displayMediaImageUrl?: string;
	displayMediaImageSource?: ResolvedImageSource;
	role?: string | null;
}

export interface StaffInspectionData {
	staffId: number;
	name: string;
	nameNative?: string;
	imageUrl?: string;
	language?: string | null;
	description?: string | null;
	primaryOccupations: string[];
	gender?: string | null;
	dateOfBirth?: string | null;
	dateOfDeath?: string | null;
	age?: number | null;
	yearsActive: number[];
	homeTown?: string | null;
	bloodType?: string | null;
	siteUrl?: string | null;
	medias: StaffMediaCreditCard[];
}
