import type {
	CharacterInspectionData,
	GroupInspectionSummary,
	GroupMediaWallRange,
	LibraryDisplayItemsPage,
	MediaInspectionData,
	MediaInspectionGroupCard,
	StaffInspectionData,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { ImageCacheService } from "../image-cache/image-cache-service";

// Renderer-facing read models keep DB rows bounded and attach display-image
// metadata only after the main process has selected the exact page/range.
export function attachLibraryDisplayImages(page: LibraryDisplayItemsPage): LibraryDisplayItemsPage {
	return {
		...page,
		items: page.items.map((item) => {
			const resolvedImage = item.kind === "group" && item.group
				? ImageCacheService.resolveGroupDisplayImage(
					item.group,
					item.imageUrl,
				)
				: typeof item.mediaId === "number"
					? ImageCacheService.resolveMediaDisplayImage(
						item.mediaId,
						item.imageUrl,
					)
					: {};

			return {
				...item,
				...resolvedImage,
			};
		}),
	};
}

export function attachGroupMediaWallDisplayImages(range: GroupMediaWallRange): GroupMediaWallRange {
	return {
		...range,
		items: range.items.map((media) => ({
			...media,
			...ImageCacheService.resolveMediaDisplayImage(
				media.mediaId,
				media.imageUrl,
			),
		})),
	};
}

export function attachGroupInspectionDisplayImages(group: GroupRef, summary: GroupInspectionSummary): GroupInspectionSummary {
	return {
		...summary,
		...ImageCacheService.resolveGroupDisplayImage(
			group,
			summary.imageUrl,
		),
	};
}

export function attachMediaInspectionDisplayImages(input: {
	mediaId: number;
	inspection: MediaInspectionData;
	groups: MediaInspectionGroupCard[];
	includeEpisodes: boolean;
}): MediaInspectionData {
	const displayImage       = ImageCacheService.resolveMediaInspectionDisplayImage(
		input.mediaId,
		input.inspection.imageUrl,
	);
	const displayBannerImage = ImageCacheService.resolveMediaBannerDisplayImage(
		input.mediaId,
		input.inspection.bannerImage,
	);

	return {
		...input.inspection,
		...displayImage,
		displayBannerImageSource: displayBannerImage.displayImageSource,
		displayBannerImageUrl:    displayBannerImage.displayImageUrl,
		groups:                   input.groups,
		episodes:                 input.includeEpisodes
																? input.inspection.episodes.map((episode) => ({
				...episode,
				...ImageCacheService.resolveEpisodeDisplayImage(
					episode.mediaId,
					episode.episodeNumber,
					episode.thumbnail,
				),
			}))
																: input.inspection.episodes,
	};
}

export function attachCharacterInspectionDisplayImages(inspection: CharacterInspectionData): CharacterInspectionData {
	return {
		...inspection,
		medias:      inspection.medias.map((media) => ({
			...media,
			...ImageCacheService.resolveMediaDisplayImage(
				media.mediaId,
				media.imageUrl,
			),
		})),
		voiceActors: inspection.voiceActors.map((voiceActor) => ({
			...voiceActor,
			appearances: voiceActor.appearances.map((appearance) => {
				const resolvedImage = ImageCacheService.resolveMediaDisplayImage(
					appearance.mediaId,
					appearance.mediaImageUrl,
				);

				return {
					...appearance,
					displayMediaImageUrl:    resolvedImage.displayImageUrl,
					displayMediaImageSource: resolvedImage.displayImageSource,
				};
			}),
		})),
	};
}

export function attachVoiceActorInspectionDisplayImages(inspection: VoiceActorInspectionData): VoiceActorInspectionData {
	return {
		...inspection,
		appearances: inspection.appearances.map((appearance) => {
			const resolvedImage = ImageCacheService.resolveMediaDisplayImage(
				appearance.mediaId,
				appearance.mediaImageUrl,
			);

			return {
				...appearance,
				displayMediaImageUrl:    resolvedImage.displayImageUrl,
				displayMediaImageSource: resolvedImage.displayImageSource,
			};
		}),
	};
}

export function attachStaffInspectionDisplayImages(inspection: StaffInspectionData): StaffInspectionData {
	return {
		...inspection,
		medias: inspection.medias.map((media) => {
			const resolvedImage = ImageCacheService.resolveMediaDisplayImage(
				media.mediaId,
				media.mediaImageUrl,
			);

			return {
				...media,
				displayMediaImageUrl:    resolvedImage.displayImageUrl,
				displayMediaImageSource: resolvedImage.displayImageSource,
			};
		}),
	};
}
