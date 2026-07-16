import {
	AniListMediaId,
	MalMediaId,
} from "./nimlat-ids";

export const ANILIST_API = "https://graphql.anilist.co";

export type MediaFormat = "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";
export type MediaStatus = "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type MediaSource =
	"ORIGINAL"
	| "MANGA"
	| "LIGHT_NOVEL"
	| "VISUAL_NOVEL"
	| "VIDEO_GAME"
	| "OTHER"
	| "NOVEL"
	| "DOUJINSHI"
	| "ANIME"
	| "WEB_NOVEL"
	| "LIVE_ACTION"
	| "GAME"
	| "COMIC"
	| "MULTIMEDIA_PROJECT"
	| "PICTURE_BOOK";
export type MediaType = "ANIME" | "MANGA";
export type MediaRankType = "RATED" | "POPULAR";
export type CharacterRole = "MAIN" | "SUPPORTING" | "BACKGROUND" | "EXTRA";
export type MediaSort = "ID" | "UPDATED_AT_DESC";
export type MediaRelationType =
	"ADAPTATION"
	| "PREQUEL"
	| "SEQUEL"
	| "PARENT"
	| "SIDE_STORY"
	| "CHARACTER"
	| "SUMMARY"
	| "ALTERNATIVE"
	| "SPIN_OFF"
	| "OTHER"
	| "SOURCE"
	| "COMPILATION"
	| "CONTAINS";

export interface MediaTitle {
	romaji?: string | null;
	english?: string | null;
	native?: string | null;
	userPreferred?: string | null; // Not used
}

export interface MediaCoverImage {
	extraLarge?: string | null;
	large?: string | null;
	medium?: string | null;
	color?: string | null;
}

export interface MediaRank {
	id: number;
	rank: number;
	type: MediaRankType;
	format: MediaFormat;
	year?: number | null;
	season?: MediaSeason | null;
	allTime?: boolean | null;
	context: string;
}

export interface MediaStats {
	scoreDistribution?: { score: number; amount: number }[] | null;
	statusDistribution?: { status: string; amount: number }[] | null;
}

export interface MediaTag {
	id: number;
	name: string;
	description?: string | null;
	category?: string | null;
	rank?: number | null; // The importance of the tag
	isGeneralSpoiler?: boolean | null;
	isMediaSpoiler?: boolean | null;
	isAdult?: boolean | null;
}

export interface MediaRelationNode extends AniListMediaIds {
	title?: MediaTitle | null;
	description?: string | null;
	coverImage?: MediaCoverImage | null;
	status?: MediaStatus | null;
	episodes?: number | null;
	nextAiringEpisode?: {
		episode?: number | null;
		timeUntilAiring?: number | null;
	} | null;
	isAdult?: boolean | null;
	format?: MediaFormat | null;
}

export interface AiringSchedule {
	id: number;
	airingAt: number;
	timeUntilAiring?: number;
	episode: number;
	mediaId: number;
	media?: AniListMedia | null;
}

export interface MediaRelation {
	edges?: {
		id?: number; // The ID of the connection, but not relevant; use node.idMal
		relationType: MediaRelationType;
		node: MediaRelationNode;
	}[] | null;
}

export interface CharacterEdge {
	id: number;
	role?: CharacterRole | null;
	name?: string | null;
	voiceActors?: AniListVoiceActor[] | null;
	node: {
		id: number;
		name: { first?: string | null; last?: string | null; full?: string | null; native?: string | null };
		image?: { large?: string | null; medium?: string | null } | null;
	};
}

export interface AniListVoiceActor {
	id: number;
	name: { first?: string | null; last?: string | null; full?: string | null; native?: string | null };
	language?: string | null;
	image?: { large?: string | null; medium?: string | null } | null;
}

export interface AniListCharacter {
	id: number;
	name: { full?: string | null; native?: string | null };
	image?: { large?: string | null; medium?: string | null } | null;
	role?: CharacterRole | null;
	voiceActors?: AniListVoiceActor[] | null;
}

export interface StaffEdge {
	id: number;
	role?: string | null;
	node: AniListStaff;
}

export interface AniListStaff {
	id: number;
	name: {
		first?: string | null;
		middle?: string | null;
		last?: string | null;
		full?: string | null;
		native?: string | null;
		alternative?: string[] | null;
	};
	language?: string | null;
	image?: { large?: string | null; medium?: string | null } | null;
	description?: string | null;
	primaryOccupations?: string[] | null;
	gender?: string | null;
	dateOfBirth?: FuzzyDate | null;
	dateOfDeath?: FuzzyDate | null;
	age?: number | null;
	yearsActive?: number[] | null;
	homeTown?: string | null;
	bloodType?: string | null;
	siteUrl?: string | null;
}

export interface MediaStudio {
	edges?: {
		isMain: boolean;
		node: {
			id: number;
			name: string;
		};
	}[] | null;
}

export interface MediaTrailer {
	id?: string | null;
	site?: string | null;
	thumbnail?: string | null;
}

export interface FuzzyDate {
	year?: number | null;
	month?: number | null;
	day?: number | null;
}

export interface PageInfo {
	total: number;
	perPage: number;
	currentPage: number;
	lastPage: number;
	hasNextPage: boolean;
}

export interface PagedResponse<T> {
	Page: {
		pageInfo: PageInfo;
		media: T[];
	};
}

export interface AniListMediaResponse<T> {
	data: {
		Media: T;
	};
}

// Main Media type
interface AniListMediaIds {
	id: AniListMediaId;
	idMal: MalMediaId | null;
}

export interface AniListMedia extends AniListMediaIds {
	title?: MediaTitle | null;
	type?: MediaType | null;
	format?: MediaFormat | null;
	status?: MediaStatus | null;
	description?: string | null;
	startDate?: FuzzyDate | null;
	endDate?: FuzzyDate | null;
	season?: MediaSeason | null;
	seasonYear?: number | null;
	episodes?: number | null;
	countryOfOrigin?: string | null;
	source?: MediaSource | null;
	trailer?: MediaTrailer | null;
	updatedAt?: number | null;
	coverImage?: MediaCoverImage | null;
	bannerImage?: string | null;
	genres?: string[] | null;
	averageScore?: number | null;
	meanScore?: number | null;
	popularity?: number | null;
	tags?: MediaTag[] | null;
	relations?: MediaRelation | null;
	characters?: { edges?: CharacterEdge[] | null } | null;
	isAdult?: boolean | null;
	nextAiringEpisode?: AiringSchedule | null;
	airingSchedule?: { nodes?: AiringSchedule[] | null } | null;
}

// Additional properties kept for reference, but not used in the app
export interface AniListMediaFull extends AniListMedia {
	hashtag?: string | null;
	synonyms?: string[] | null;
	staff?: { edges?: StaffEdge[] | null } | null;
	studios?: MediaStudio | null;
	isFavourite?: boolean | null;
	isFavouriteBlocked?: boolean | null;
	isLocked?: boolean | null;
	isLicensed?: boolean | null;
	trending?: number | null;
	favourites?: number | null;
	duration?: number | null;
	chapters?: number | null;
	volumes?: number | null;
	seasonInt?: number | null;
	trends?: { nodes?: { trending: number; averageScore?: number | null }[] | null } | null;
	rankings?: MediaRank[] | null;
	stats?: MediaStats | null;
	autoCreateForumThread?: boolean | null;
	isRecommendationBlocked?: boolean | null;
	isReviewBlocked?: boolean | null;
	modNotes?: string | null;
}
