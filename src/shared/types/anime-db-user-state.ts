import type {
	MediaFormat,
	MediaStatus,
} from "./ani-list-media-api";
import type {
	IntegrationStatus,
	PlaybackIssueCategory,
} from "./anime-db-integration";
import type { NumberAsBoolean } from "./databases";
import type {
	EpisodeId,
	GroupLineageId,
	GroupRef,
	MediaId,
} from "./nimlat-ids";
import type {
	ReleaseDatePrecision,
	ReleaseDateSource,
	ReleaseWatchDomain,
	ReleaseWatchReason,
	ReleaseWatchState,
	ScheduledMediaRefreshOutcome,
} from "./release-watch";

// User DB DTOs represent mutable installation-owned state layered over AnimeDB.
// Keeping them separate from catalog DTOs lets migrations preserve user choices
// independently from replacement of the provider-generated catalog asset.
export type UserGroupingMode = "anime" | "user";

export interface UserGroupingStateDto {
	id: 1;
	groupingMode: UserGroupingMode;
	forkedFromAnimeDbVersion?: string | null;
	lastReconciledAnimeDbVersion?: string | null;
	lastReconciledAt?: number | null;
	lastReconcileStatus?: string | null;
	lastReconcileSummaryJson?: string | null;
}

interface PlaybackIssueFlagsDto {
	playbackIssueNote?: string | null;
	hasDubIssue?: NumberAsBoolean;
	hasSubIssue?: NumberAsBoolean;
	hasEncodingIssue?: NumberAsBoolean;
	hasAudioIssue?: NumberAsBoolean;
	hasVideoIssue?: NumberAsBoolean;
}

export interface UserGroupOverrideDto {
	// References anime_data.groups.id, not the Group business identity.
	// This override exists only for anime-mode reads before/without a grouping fork.
	animeGroupId: number;
	name?: string | null;
	nameSearchKey?: string | null;
	description?: string | null;
	imageUrl?: string | null;
	updatedAt: number;
}

export interface UserEpisodeOverrideDto {
	mediaId: MediaId;
	episodeNumber: number;
	name?: string | null;
	description?: string | null;
	thumbnail?: string | null;
	aired?: string | null;
	updatedAt: number;
}

export interface UserEpisodeStateDto extends PlaybackIssueFlagsDto {
	mediaId: MediaId;
	episodeNumber: number;
	integrationStatus?: IntegrationStatus | null;
	updatedAt: number;
}

export interface UserEpisodePlaybackIssueMomentDto {
	mediaId: MediaId;
	episodeNumber: number;
	playbackIssueCategory: PlaybackIssueCategory;
	timeSeconds: number;
	note?: string | null;
	updatedAt: number;
}

export interface UserEpisodeIntegrationSnapshotDto {
	mediaId: MediaId;
	episodeNumber: number;
	// Integration percent is the computed tracked-progress percentage for this episode.
	// `null` means "not interested" / untracked, so no progress bar should be shown.
	integrationPercent?: number | null;
	updatedAt: number;
}

export interface UserGroupBlueprintDto {
	// Local SQLite row id for one concrete user-owned Group row inside user_data.
	// This is a runtime join/mutation key only.
	id: number;
	// Primary visible business identity of this user Group.
	// For official imported Groups this starts from AnimeDB. After merges, additional
	// historical base-media identities are preserved in UserGroupLineageDto.
	baseMediaId: MediaId;
	name: string;
	nameSearchKey?: string | null;
	description?: string | null;
	imageUrl?: string | null;
	isUserCreated: NumberAsBoolean;
	createdAt: number;
	updatedAt: number;
}

export interface UserGroupMediaLinkDto {
	groupId: number;
	mediaId: MediaId;
}

export type UserGroupLineageStatus = "active" | "deleted" | "merged";

export interface UserGroupLineageDto {
	// Base-media anchor for one official AnimeDB Group lineage.
	// Writers resolve this through anime_data.groupLineages.baseMediaId before
	// storing userGroupLineages.groupLineageId, so durable user state never relies
	// on lineage IDs remaining numerically equal to media IDs.
	animeBaseMediaId: MediaId;
	userGroupId?: number | null;
	status: UserGroupLineageStatus;
	firstSeenAnimeDbVersion?: string | null;
	lastSeenAnimeDbVersion?: string | null;
	lastAutoImportedAt?: number | null;
	lastUserModifiedAt?: number | null;
}

export interface UserReleaseWatchStateDto {
	mediaId: MediaId;
	watchDomain: ReleaseWatchDomain;
	state: ReleaseWatchState;
	resolvedReleaseAt?: number | null;
	releaseDatePrecision: ReleaseDatePrecision;
	releaseDateSource: ReleaseDateSource;
	lastObservedReleaseAt?: number | null;
	lastCatalogRefreshAt?: number | null;
	lastIntegratedAt?: number | null;
	payloadJson?: string | null;
	updatedAt: number;
}

export interface UserScheduledMediaRefreshDto {
	mediaId: MediaId;
	releaseWatchReason: ReleaseWatchReason;
	scheduledReleaseAt: number;
	nextAttemptAt: number;
	attemptCount: number;
	lastAttemptAt?: number | null;
	lastOutcome?: ScheduledMediaRefreshOutcome | null;
	lastObservedCatalogStateHash?: string | null;
	cooldownUntil?: number | null;
	updatedAt: number;
}

export interface ReleaseWatchMediaFactsDto {
	mediaId: MediaId;
	name: string;
	format?: MediaFormat | null;
	status?: MediaStatus | null;
	episodesCount?: number | null;
	nextAiringEpisodeJson?: string | null;
	startDateYear?: number | null;
	startDateMonth?: number | null;
	startDateDay?: number | null;
	integrationStatus?: IntegrationStatus | null;
	integrationPercent?: number | null;
	lastRefreshAt?: number | null;
}

// Final user_data row DTOs keyed by canonical Nimlat ids.
export interface UserMediaOverrideRowDto {
	mediaId: MediaId;
	name?: string | null;
	nameSearchKey?: string | null;
	description?: string | null;
	customImageUrl?: string | null;
	updatedAt: number;
}

export interface UserEpisodeOverrideRowDto {
	episodeId: EpisodeId;
	name?: string | null;
	description?: string | null;
	thumbnail?: string | null;
	aired?: string | null;
	updatedAt: number;
}

export interface UserEpisodeStateRowDto extends PlaybackIssueFlagsDto {
	episodeId: EpisodeId;
	integrationStatus?: IntegrationStatus | null;
	updatedAt: number;
}

export interface UserEpisodePlaybackIssueMomentRowDto {
	episodeId: EpisodeId;
	playbackIssueCategory: PlaybackIssueCategory;
	timeSeconds: number;
	note?: string | null;
	updatedAt: number;
}

export interface UserEpisodeIntegrationSnapshotRowDto {
	episodeId: EpisodeId;
	integrationPercent?: number | null;
	updatedAt: number;
}

export interface UserMediaStateRowDto extends PlaybackIssueFlagsDto {
	mediaId: MediaId;
	integrationStatus?: IntegrationStatus | null;
	updatedAt: number;
}

export interface UserMediaPlaybackIssueMomentRowDto {
	mediaId: MediaId;
	playbackIssueCategory: PlaybackIssueCategory;
	timeSeconds: number;
	note?: string | null;
	updatedAt: number;
}

export interface UserMediaIntegrationSnapshotRowDto {
	mediaId: MediaId;
	integrationPercent?: number | null;
	updatedAt: number;
}

export interface UserGroupRowDto {
	id: number;
	groupLineageId?: GroupLineageId | null;
	baseMediaId?: MediaId | null;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
	isUserCreated: NumberAsBoolean;
	createdAt: number;
	updatedAt: number;
}

export interface UserGroupMediaDto {
	groupId: number;
	mediaId: MediaId;
}

export interface UserGroupLineageRowDto {
	groupLineageId: GroupLineageId;
	userGroupId?: number | null;
	status: UserGroupLineageStatus;
	firstSeenAnimeDbVersion?: string | null;
	lastSeenAnimeDbVersion?: string | null;
	lastAutoImportedAt?: number | null;
	lastUserModifiedAt?: number | null;
}

export interface UserGroupStateRowDto {
	groupLineageId: GroupLineageId;
	integrationStatus?: IntegrationStatus | null;
	updatedAt: number;
}

export interface UserGroupIntegrationSnapshotRowDto {
	groupLineageId: GroupLineageId;
	integrationPercent?: number | null;
	updatedAt: number;
}

// Compact current Group membership used by inspection and other bounded read models.
export interface MediaGroupSummaryDto {
	groupId: number;
	mediaId: MediaId;
	name: string;
	imageUrl?: string | null;
}

export interface IntegrationCascadeResultDto {
	affectedMediaIds: MediaId[];
	affectedGroups: GroupRef[];
}

export interface GroupingMutationImpactDto {
	affectedMediaIds: MediaId[];
	affectedGroupIds: number[];
}

// Atomic "create merged group" writes need the created id plus the usual Library invalidation footprint.
export interface CreateMergedUserGroupResultDto extends GroupingMutationImpactDto {
	createdGroupId: number;
}

// Result of restoring one deleted upstream lineage back into the forked user grouping snapshot.
export interface RestoreUserGroupLineageResultDto extends GroupingMutationImpactDto {
	groupLineageId: number;
	restoredGroupId: number;
}
