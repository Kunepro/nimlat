import type { UserGroupingMode } from "./anime-db-user-state";
import type {
	GroupInspectionSummary,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	GroupMediaWallRange,
	GroupMediaWallRangeRequest,
} from "./ipc-group-inspection-payloads";
import type {
	GroupImageSelectionResult,
	GroupRefreshActionResult,
	GroupUpdateDetailsActionResult,
	UpdateGroupDetailsRequest,
} from "./ipc-group-mutation-payloads";
import type {
	DeleteMediaImageGalleryImageRequest,
	EpisodeImageGalleryData,
	GroupImageGalleryData,
	MediaImageGalleryData,
	SaveEpisodeEditRequest,
	SaveEpisodeImageGalleryRequest,
	SaveGroupEditRequest,
	SaveGroupImageGalleryRequest,
	SaveImageGalleryActionResult,
	SaveMediaEditRequest,
	SaveMediaImageGalleryRequest,
	UploadEpisodeImageGalleryImageRequest,
	UploadGroupImageGalleryImageRequest,
	UploadImageGalleryImageActionResult,
	UploadMediaImageGalleryImageRequest,
} from "./ipc-image-gallery-payloads";
import type {
	IntegrationStatusActionResult,
	MediaWatchStateActionResult,
	SaveEpisodeIntegrationStateRequest,
	SaveMediaIntegrationStateRequest,
	SetEpisodeIntegrationStatusesRequest,
	SetEpisodeIntegrationStatusRequest,
	SetEpisodeWatchStateRequest,
	SetEpisodeWatchStatesRequest,
	SetGroupIntegrationStatusRequest,
	SetGroupWatchStateRequest,
	SetMediaIntegrationStatusRequest,
	SetMediaWatchStateRequest,
} from "./ipc-integration-payloads";
import type {
	GroupExplorerCardsPage,
	GroupListChangedEvent,
	LibraryDisplayItemsPage,
	LibraryDisplayItemsRange,
	LibraryDisplayItemsRangeRequest,
	LibraryDisplayScope,
	LibraryFilterOptions,
} from "./ipc-library-payloads";
import type {
	EpisodeUpdateDetailsActionResult,
	MediaRefreshActionResult,
	MediaUpdateDetailsActionResult,
	ResetEpisodeDetailsRequest,
	ResetMediaDetailsRequest,
	UpdateEpisodeDetailsRequest,
	UpdateMediaDetailsRequest,
} from "./ipc-media-edit-payloads";
import type {
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	MediaEpisodeUpdatesIssue,
	MediaInspectionData,
	MediaInspectionOptions,
	RetryMediaEpisodeUpdatesResult,
} from "./ipc-media-inspection-payloads";
import type {
	CharacterInspectionData,
	MediaCharacterListItem,
	MediaStaffListItem,
	StaffInspectionData,
	VoiceActorInspectionData,
} from "./ipc-people-payloads";
import type {
	GroupRef,
	MediaId,
} from "./nimlat-ids";
import type { GroupReleaseTimelineRow } from "./release-watch";
import type { LibraryDisplayFilters } from "./user-config";

// Main Library/media exploration API exposed to renderer facades. This interface
// intentionally groups read models, edits, image gallery commands, and invalidation
// events that operate on the same visible Library/media surface.
export interface GroupExplorerElectronApi {
	listLibraryItems(offset: number, limit: number, search: string, scope?: LibraryDisplayScope, filters?: Partial<LibraryDisplayFilters>): Promise<LibraryDisplayItemsPage>;

	listLibraryItemsRange(request: LibraryDisplayItemsRangeRequest): Promise<LibraryDisplayItemsRange>;

	listLibraryFilterOptions(): Promise<LibraryFilterOptions>;

	listCards(offset: number, limit: number, search: string): Promise<GroupExplorerCardsPage>;

	getInspectionSummary(group: GroupRef): Promise<GroupInspectionSummary | null>;

	listGroupMediaRange(request: GroupMediaWallRangeRequest): Promise<GroupMediaWallRange>;

	getReleaseTimeline(group: GroupRef): Promise<GroupReleaseTimelineRow[]>;

	getMediaInspection(mediaId: MediaId, options?: MediaInspectionOptions): Promise<MediaInspectionData | null>;

	listMediaCharacters(mediaId: MediaId): Promise<MediaCharacterListItem[]>;

	listMediaStaff(mediaId: MediaId): Promise<MediaStaffListItem[]>;

	getCharacterInspection(characterId: number): Promise<CharacterInspectionData | null>;

	getVoiceActorInspection(staffId: number): Promise<VoiceActorInspectionData | null>;

	getStaffInspection(staffId: number): Promise<StaffInspectionData | null>;

	refreshMedia(mediaId: MediaId): Promise<MediaRefreshActionResult>;

	updateMediaDetails(request: UpdateMediaDetailsRequest): Promise<MediaUpdateDetailsActionResult>;

	saveMediaEdit(request: SaveMediaEditRequest): Promise<MediaUpdateDetailsActionResult>;

	resetMediaDetails(request: ResetMediaDetailsRequest): Promise<MediaUpdateDetailsActionResult>;

	updateEpisodeDetails(request: UpdateEpisodeDetailsRequest): Promise<EpisodeUpdateDetailsActionResult>;

	saveEpisodeEdit(request: SaveEpisodeEditRequest): Promise<EpisodeUpdateDetailsActionResult>;

	resetEpisodeDetails(request: ResetEpisodeDetailsRequest): Promise<EpisodeUpdateDetailsActionResult>;

	setEpisodeIntegrationStatus(request: SetEpisodeIntegrationStatusRequest): Promise<IntegrationStatusActionResult>;

	setEpisodeIntegrationStatuses(request: SetEpisodeIntegrationStatusesRequest): Promise<IntegrationStatusActionResult>;

	saveEpisodeIntegrationState(request: SaveEpisodeIntegrationStateRequest): Promise<IntegrationStatusActionResult>;

	setMediaIntegrationStatus(request: SetMediaIntegrationStatusRequest): Promise<IntegrationStatusActionResult>;

	saveMediaIntegrationState(request: SaveMediaIntegrationStateRequest): Promise<IntegrationStatusActionResult>;

	setGroupIntegrationStatus(request: SetGroupIntegrationStatusRequest): Promise<IntegrationStatusActionResult>;

	setMediaWatchState(request: SetMediaWatchStateRequest): Promise<MediaWatchStateActionResult>;

	setEpisodeWatchState(request: SetEpisodeWatchStateRequest): Promise<MediaWatchStateActionResult>;

	setEpisodeWatchStates(request: SetEpisodeWatchStatesRequest): Promise<MediaWatchStateActionResult>;

	setGroupWatchState(request: SetGroupWatchStateRequest): Promise<MediaWatchStateActionResult>;

	onGroupListChanged(callback: (event: GroupListChangedEvent) => void): () => void;

	onGroupMediaListChanged(callback: (event: GroupMediaListChangedEvent) => void): () => void;

	onGroupMediaItemsPatched(callback: (event: GroupMediaItemsPatchedEvent) => void): () => void;

	onMediaEpisodesListChanged(callback: (event: MediaEpisodesListChangedEvent) => void): () => void;

	onMediaEpisodesItemsPatched(callback: (event: MediaEpisodesItemsPatchedEvent) => void): () => void;

	getMediaEpisodeUpdatesIssue(mediaId: MediaId): Promise<MediaEpisodeUpdatesIssue | null>;

	retryMediaEpisodeUpdates(mediaId: MediaId): Promise<RetryMediaEpisodeUpdatesResult>;

	refreshGroup(group: GroupRef): Promise<GroupRefreshActionResult>;

	updateGroupDetails(request: UpdateGroupDetailsRequest): Promise<GroupUpdateDetailsActionResult>;

	saveGroupEdit(request: SaveGroupEditRequest): Promise<GroupUpdateDetailsActionResult>;

	pickGroupImage(): Promise<GroupImageSelectionResult>;

	getGroupImageGallery(group: GroupRef): Promise<GroupImageGalleryData>;

	uploadGroupImageGalleryImage(request: UploadGroupImageGalleryImageRequest): Promise<UploadImageGalleryImageActionResult>;

	saveGroupImageGallery(request: SaveGroupImageGalleryRequest): Promise<SaveImageGalleryActionResult>;

	getMediaImageGallery(mediaId: MediaId): Promise<MediaImageGalleryData>;

	uploadMediaImageGalleryImage(request: UploadMediaImageGalleryImageRequest): Promise<UploadImageGalleryImageActionResult>;

	deleteMediaImageGalleryImage(request: DeleteMediaImageGalleryImageRequest): Promise<SaveImageGalleryActionResult>;

	saveMediaImageGallery(request: SaveMediaImageGalleryRequest): Promise<SaveImageGalleryActionResult>;

	getEpisodeImageGallery(mediaId: MediaId, episodeNumber: number): Promise<EpisodeImageGalleryData>;

	uploadEpisodeImageGalleryImage(request: UploadEpisodeImageGalleryImageRequest): Promise<UploadImageGalleryImageActionResult>;

	saveEpisodeImageGallery(request: SaveEpisodeImageGalleryRequest): Promise<SaveImageGalleryActionResult>;

	getGroupingMode(): Promise<UserGroupingMode>;
}
