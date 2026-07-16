import type {
	CharacterRole,
	MediaFormat,
	MediaRelationType,
	MediaSeason,
	MediaSource,
	MediaStatus,
} from "./ani-list-media-api";
import type {
	GroupLineageProviderMappingType,
	ProviderMappingConfidence,
	ProviderName,
} from "./anime-db-provider";
import type { NumberAsBoolean } from "./databases";
import type {
	AniListMediaId,
	EpisodeId,
	GroupLineageId,
	MalMediaId,
	MediaId,
} from "./nimlat-ids";

// Catalog DTOs mirror persisted anime_data rows and provider mappings shared by
// DB operations, main services, and renderer payloads. Because AnimeDB V1 is a
// distributed frozen asset, field/nullability/enum changes require an explicitly
// approved schema and replacement/migration plan.
export interface AnimeDbReadinessFactsDto {
	hasRequiredSchema: boolean;
	hasCatalogMedia: boolean;
	hasCatalogGroups: boolean;
	missingTables: string[];
}

export type AnimeDbMediaIngestionSource =
	| "anime-db-populator"
	| "anime-db-updater"
	| "release-watch-daemon"
	| "group-explorer-refresh"
	| "media-inspection-refresh";

export interface CatalogMediaIngestedEvent {
	mediaId: MediaId;
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
	source: AnimeDbMediaIngestionSource;
}

export interface MediaDto {
	// Canonical Nimlat media identity.
	// AnimeDB V1 seeds it from AniList, but provider code must not rely on equality.
	mediaId: MediaId;
	// Compatibility/provider bridge columns; mapping tables are authoritative when present.
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
	name?: string | null;
	nameJapanese?: string | null;
	nameRomanji?: string | null;
	nameSearchKey?: string | null;
	type?: string | null;
	format?: MediaFormat | null;
	status?: MediaStatus | null;
	description?: string | null;
	startDateYear?: number | null;
	startDateMonth?: number | null;
	startDateDay?: number | null;
	endDateYear?: number | null;
	endDateMonth?: number | null;
	endDateDay?: number | null;
	season?: MediaSeason | null;
	seasonYear?: number | null;
	episodesCount?: number | null;
	countryOfOrigin?: string | null;
	source?: MediaSource | null;
	trailerJson?: string | null;
	updatedAt?: number | null;
	lastUpdatedAt?: number | null;
	coverImageJson?: string | null;
	bannerImage?: string | null;
	customImageUrl?: string | null;
	averageScore?: number | null;
	meanScore?: number | null;
	popularity?: number | null;
	isAdult?: NumberAsBoolean;
	isStub?: NumberAsBoolean;
	nextAiringEpisodeJson?: string | null;
	nextAiringEpisode?: number | null;
	airingScheduleJson?: string | null;
}

export interface MediaDetailsSnapshotDto {
	mediaId: MediaId;
	name: string;
	description?: string;
	imageUrl?: string;
}

export interface MediaImageGallerySourceDto {
	mediaId: MediaId;
	imageUrl?: string;
	bannerImage?: string;
}

// Compact catalog image data for caller-bounded sets such as one Group gallery.
export interface MediaImagePreviewDto {
	mediaId: MediaId;
	name: string;
	coverImageJson?: string | null;
	bannerImage?: string | null;
}

interface EpisodeAniListDto {
	name?: string;
	thumbnail?: string;
	url?: string; // combines site and url
}

interface EpisodeJikanDto {
	episodeNumber: number;
	url: string;
	name: string;
	nameJapanese: string | null;
	nameRomanji: string | null;
	synopsis: string | null;
	duration: number | null;
	aired: string | null;
	score: number | null;
	filler: boolean;
	recap: boolean;
}

export type EpisodeDto = EpisodeAniListDto &
	EpisodeJikanDto & {
	// Canonical Nimlat episode identity bridge columns.
	// Nullable compatibility reads may still originate from mediaId + episodeNumber rows.
	episodeId?: EpisodeId | null;
	mediaId?: MediaId | null;
	legacyMediaId: MediaId;
};

export interface EpisodeDetailsSnapshotDto {
	mediaId: MediaId;
	episodeNumber: number;
	name?: string;
	description?: string;
	aired?: string;
	duration?: number | null;
	score?: number | null;
	filler?: boolean;
	recap?: string;
	thumbnail?: string;
}

export interface GroupLineageDto {
	groupLineageId: GroupLineageId;
	baseMediaId?: MediaId | null;
}

export interface GroupDto {
	id: number;
	groupLineageId: GroupLineageId;
	name: string;
	nameSearchKey?: string | null;
	description?: string | null;
	imageUrl?: string | null;
}

export interface GroupMediaDto {
	groupId: number;
	mediaId: MediaId;
	isOfficial: boolean;
}

export interface MediaRelationCanonicalDto {
	mediaId: MediaId;
	relatedMediaId: MediaId;
	relationType: MediaRelationType;
}

// Provider-facing identifiers resolved for one canonical media row.
// Internal code should keep using `mediaId` and consult these only when an
// external provider endpoint explicitly requires provider-native IDs.
export interface MediaProviderIdsDto {
	mediaId: MediaId;
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
}

export interface MediaProviderMappingDto {
	mediaId: MediaId;
	provider: ProviderName;
	providerMediaId: string;
	isPrimary: NumberAsBoolean;
	lastVerifiedAt?: number | null;
	mappingConfidence?: ProviderMappingConfidence | null;
}

export interface EpisodeProviderMappingDto {
	episodeId: EpisodeId;
	provider: ProviderName;
	providerEpisodeId?: string | null;
	providerMediaId?: string | null;
	providerEpisodeNumber?: string | null;
	lastVerifiedAt?: number | null;
	mappingConfidence?: ProviderMappingConfidence | null;
}

export interface GroupLineageProviderMappingDto {
	groupLineageId: GroupLineageId;
	provider: ProviderName;
	providerGroupKey: string;
	mappingType: GroupLineageProviderMappingType;
	lastVerifiedAt?: number | null;
	mappingConfidence?: ProviderMappingConfidence | null;
}

export interface GroupBlueprintDto {
	// Local SQLite row id for one concrete Group row inside anime_data.
	// This is a runtime join/mutation key only and must never be treated as stable
	// across AnimeDB rebuilds or downloads.
	id: number;
	// Canonical Nimlat Group business identity.
	// This is the internal media id of the media chosen as the Group base and is what official
	// import/reconcile logic must match on inside Nimlat.
	baseMediaId: MediaId;
	name: string;
	description?: string;
	imageUrl?: string;
}

export interface GroupMediaLinkDto {
	mediaId: MediaId;
	groupId: number;
	isOfficial: boolean;
}

export interface MediaCoverImageParsedJson {
	extraLarge?: string;
	large?: string;
	medium?: string;
	color?: string;
}

export interface GenreDto {
	id: number;
	name: string;
}

export interface MediaGenreDto {
	mediaId: MediaId;
	genreId: number;
}

export interface TagDto {
	id: number;
	name: string;
	description?: string;
	category?: string;
	rank?: number;
	isGeneralSpoiler?: boolean;
	isMediaSpoiler?: boolean;
}

export interface MediaTagDto {
	mediaId: MediaId;
	tagId: number;
}

export interface CharacterDto {
	id: number;
	nameFull?: string;
	nameNative?: string;
	imageJson?: string;
	role?: CharacterRole;
}

export interface MediaCharacterDto {
	mediaId: MediaId;
	characterId: number;
}

export interface MediaRelationDto {
	mediaId: MediaId;
	relatedMediaId: MediaId;
	relationType: MediaRelationType;
}
