import type {
	EpisodeDetailsSnapshotDto,
	MediaAdHocRefreshFactsDto,
	MediaDetailsSnapshotDto,
	MediaImageGallerySourceDto,
	MediaImagePreviewDto,
	MediaProviderIdsDto,
} from "@nimlat/types/anime-db";
import type {
	MediaCharacterListItem,
	MediaInspectionData,
	MediaInspectionOptions,
	MediaStaffListItem,
} from "@nimlat/types/ipc-payloads";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { selectAniListCompatibleMediaIdByCanonicalMediaId } from "./canonical/select-ani-list-compatible-media-id-by-canonical-media-id";
import { selectMediaCharactersByMediaId } from "./characters/select-media-characters-by-media-id";
import { selectEpisodeDetailsSnapshotById } from "./media/select-episode-details-snapshot-by-id";
import { selectMediaAdHocRefreshFactsById } from "./media/select-media-ad-hoc-refresh-facts-by-id";
import { selectMediaDetailsSnapshotById } from "./media/select-media-details-snapshot-by-id";
import { selectMediaHasFailedHydrationById } from "./media/select-media-has-failed-hydration-by-id";
import { selectMediaImageGallerySourceById } from "./media/select-media-image-gallery-source-by-id";
import { selectMediaImagePreviewsByIds } from "./media/select-media-image-previews-by-ids";
import { selectMediaInspectionById } from "./media/select-media-inspection-by-id";
import { selectMediaLastRefreshAtById } from "./media/select-media-last-refresh-at-by-id";
import { selectMediaProviderIds } from "./media/select-media-provider-ids";
import { selectOfficialGroupIdsByMediaId } from "./media/select-official-group-ids-by-media-id";
import { selectMediaStaffByMediaId } from "./staff/select-media-staff-by-media-id";

// Read models for media inspection, gallery sources, provider identity, and
// refresh status stay DB-owned so renderer/main services avoid table coupling.
export const AnimeDbMediaReadFacade = {
	getInspection(mediaId: number, options?: MediaInspectionOptions): MediaInspectionData | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getInspection",
			() => selectMediaInspectionById(
				mediaId,
				options,
			),
			{ mediaId },
		);
	},

	getDetailsSnapshot(mediaId: number): MediaDetailsSnapshotDto | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getDetailsSnapshot",
			() => selectMediaDetailsSnapshotById(mediaId),
			{ mediaId },
		);
	},

	getImageGallerySource(mediaId: number): MediaImageGallerySourceDto | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getImageGallerySource",
			() => selectMediaImageGallerySourceById(mediaId),
			{ mediaId },
		);
	},

	getEpisodeDetailsSnapshot(mediaId: number, episodeNumber: number): EpisodeDetailsSnapshotDto | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getEpisodeDetailsSnapshot",
			() => selectEpisodeDetailsSnapshotById(
				mediaId,
				episodeNumber,
			),
			{
				mediaId,
				episodeNumber,
			},
		);
	},

	listCharacters(mediaId: number): MediaCharacterListItem[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.listCharacters",
			() => selectMediaCharactersByMediaId(mediaId),
			{ mediaId },
		);
	},

	listStaff(mediaId: number): MediaStaffListItem[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.listStaff",
			() => selectMediaStaffByMediaId(mediaId),
			{ mediaId },
		);
	},

	getImagePreviews(mediaIds: number[]): MediaImagePreviewDto[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getImagePreviews",
			() => selectMediaImagePreviewsByIds(mediaIds),
			{ mediaIds },
		);
	},

	hasFailedHydrationIssue(mediaId: number): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.hasFailedHydrationIssue",
			() => selectMediaHasFailedHydrationById(mediaId),
			{ mediaId },
		);
	},

	getLastRefreshAt(mediaId: number): number | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getLastRefreshAt",
			() => selectMediaLastRefreshAtById(mediaId),
			{ mediaId },
		);
	},

	getAdHocRefreshFacts(mediaId: number): MediaAdHocRefreshFactsDto | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getAdHocRefreshFacts",
			() => selectMediaAdHocRefreshFactsById(mediaId),
			{ mediaId },
		);
	},

	getAniListCompatibleId(mediaId: number): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getAniListCompatibleId",
			() => selectAniListCompatibleMediaIdByCanonicalMediaId(mediaId),
			{ mediaId },
		);
	},

	getProviderIds(mediaId: number): MediaProviderIdsDto {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getProviderIds",
			() => selectMediaProviderIds(mediaId),
			{ mediaId },
		);
	},

	getOfficialGroupIds(mediaId: number): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.getOfficialGroupIds",
			() => selectOfficialGroupIdsByMediaId(mediaId),
			{ mediaId },
		);
	},
} as const;
