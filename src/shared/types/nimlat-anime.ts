// Normalized application models used by services/UI. They may differ from DB and
// provider payloads only through explicit mapping boundaries.
import {
	MalMediaId,
	MediaId,
} from "./nimlat-ids";

export type MediaIntegrationStatus =
	| "ignored"
	| "tracked"
	| "downloading"
	| "downloaded"
	| "integrated";

export interface AnimeIntegrationStatus {
	integration: MediaIntegrationStatus;
	audioIssue: boolean;
	videoIssue: boolean;
	subtitleIssue: boolean;
	dubIssue: boolean;
	encodingIssue: boolean;
	playbackIssueNote: string;
}

export interface AnimeEpisode {
	mediaId: MediaId;
	episodeNumber: number;
	name?: string;
	nameJapanese?: string;
	nameRomanji?: string;
	aired?: string;
	score?: number;
	filler: boolean;
	recap: boolean;
	thumbnail?: string;
	url?: string;
	// Integration fields are user_data overlays and never belong to the catalog episode row.
	integrationStatus?: AnimeIntegrationStatus;
	integrationPercent?: number;
}

export interface AnimeMedia {
	mediaId: MediaId;
	idMal?: MalMediaId;
	name: {
		romanji: string;
		english: string;
		native: string;
	};
	type?: string;
	format?: string;
	status?: string;       // FINISHED, RELEASING, etc.
	description?: string;
	season?: string;
	seasonYear?: number;
	episodesCount?: number;

	// Dates as separate components
	startDateYear?: number;
	startDateMonth?: number;
	startDateDay?: number;
	endDateYear?: number;
	endDateMonth?: number;
	endDateDay?: number;
	releaseDate: string;

	// Raw provider JSON retained by the catalog mapping boundary.
	coverImageJson?: string;
	trailerJson?: string;
	nextAiringEpisodeJson?: string;
	airingScheduleJson?: string;

	// Provider/catalog metadata copied into the normalized read model.
	countryOfOrigin?: string;
	source?: string;
	updatedAt?: number;
	portraitImage?: string;
	landscapeImage?: string;
	averageScore?: number;
	meanScore?: number;
	popularity?: number;
	favourites?: number;
	trending?: number;
	isAdult?: boolean;

	// Joined from canonical episode rows, not embedded in the media table.
	episodes?: AnimeEpisode[];

	// Installation-owned tracking overlay from user_data.
	integrationStatus?: AnimeIntegrationStatus;
	integrationPercent: number;
	lastChecked?: number;
}

interface AnimeGroupBase {
	id: number;
	// Mutable display/business anchor; stable official identity lives in the lineage.
	baseMediaId: MediaId;

	// Joined through the current Group membership table.
	medias: AnimeMedia[];

	// Installation-owned aggregate tracking overlay from user_data.
	integrationStatus?: AnimeIntegrationStatus;
	integrationPercent: number;
	lastRefresh: string;
}

export interface AnimeGroupDetails {
	name: string;
	description?: string;
	imageUrl?: string;
}

export type AnimeGroup = AnimeGroupBase & AnimeGroupDetails;

// Junction table for Group-to-Media relationships.
export interface GroupMediaRelation {
	groupId: number;
	mediaId: MediaId;
}

export interface CoverImage {
	extraLarge?: string;
	large?: string;
	medium?: string;
	color?: string;
}

export interface NextAiringEpisode {
	airingAt: number;
	timeUntilAiring: number;
	episode: number;
}

export interface Trailer {
	id: string;
	site: string;
	thumbnail: string;
}

// View model interfaces - for UI presentation
export interface EpisodeViewModel {
	id: string;           // Typically `${mediaId}-${episodeNumber}`
	name: string;
	episodeNumber: number;
	thumbnail?: string;
	aired?: string;
	status?: AnimeIntegrationStatus;
	integrationPercent?: number;
}

export interface MediaViewModel {
	id: MediaId;
	name: string;
	coverImage?: string;  // Parsed from coverImageJson
	episodes: EpisodeViewModel[];
	status?: string;
	startDate?: string;   // Formatted from component parts
	endDate?: string;
	integrationPercent?: number;
}

export interface GroupViewModel {
	id: string;
	name: string;
	description?: string;
	imageUrl?: string;
	medias: MediaViewModel[];
	integrationPercent?: number;
	lastRefresh?: string;
}
