import {
	AnimeDbFacade,
	ImageGalleryDbFacade,
} from "@nimlat/database";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type {
	EpisodeImageGalleryData,
	GroupImageGalleryData,
	ImageGalleryCandidate,
	MediaImageGalleryData,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { existsSync } from "node:fs";
import { GroupReadRepository } from "../group/group-read-repository";
import { ImageCacheService } from "./image-cache-service";
import {
	createProviderCandidateKey,
	createUploadedCandidateKey,
	getDefaultActiveCandidateKey,
	mapGalleryRoleToImageRole,
	type OwnerTarget,
	type ProviderCandidateInput,
} from "./image-gallery-model";
import {
	createEpisodeOwnerTarget,
	createGroupOwnerTarget,
	createMediaOwnerTarget,
} from "./image-gallery-owner-targets";
import {
	buildGroupProviderCandidates,
	buildMediaGalleryProviderCandidates,
} from "./image-gallery-provider-candidates";

export function getMediaImageGalleryReadModel(mediaId: number): MediaImageGalleryData {
	const source         = AnimeDbFacade.media.getImageGallerySource(mediaId);
	const owner          = createMediaOwnerTarget(mediaId);
	const imageProviders = buildMediaGalleryProviderCandidates(source);
	const tabs           = buildImageGalleryTabs(
		owner,
		imageProviders.portraitProviders,
		imageProviders.bannerProviders,
	);

	return {
		mediaId,
		tabs,
	};
}

export function getGroupImageGalleryReadModel(group: GroupRef): GroupImageGalleryData {
	const summary = GroupReadRepository.getInspectionSummaryByRef(group);
	if (!summary) {
		throw new Error(`Group ${ group.groupId } is not available for image editing.`);
	}

	const mediaIds           = GroupReadRepository.getMediaIdsByRef(group);
	const previews           = mediaIds.length > 0
		? AnimeDbFacade.media.getImagePreviews(mediaIds)
		: [];
	const owner              = createGroupOwnerTarget(group);
	const providerCandidates = buildGroupProviderCandidates(
		summary.imageUrl,
		previews,
	);
	const tabs               = buildImageGalleryTabs(
		owner,
		providerCandidates.filter((candidate) => candidate.role === "portrait"),
		providerCandidates.filter((candidate) => candidate.role === "banner"),
	);

	return {
		group,
		tabs,
	};
}

export function getEpisodeImageGalleryReadModel(mediaId: number, episodeNumber: number): EpisodeImageGalleryData {
	const episode = AnimeDbFacade.media.getEpisodeDetailsSnapshot(
		mediaId,
		episodeNumber,
	);
	if (!episode) {
		throw new Error(`Episode ${ episodeNumber } for media ${ mediaId } is not available for image editing.`);
	}

	return {
		mediaId,
		episodeNumber,
		tabs: [
			buildImageGalleryTab(
				createEpisodeOwnerTarget(
					mediaId,
					episodeNumber,
				),
				"thumbnail",
				"Thumbnail",
				episode.thumbnail
					? [
						{
							role:     "thumbnail",
							label:    "Current episode thumbnail",
							imageUrl: episode.thumbnail,
						},
					]
					: [],
			),
		],
	};
}

function buildImageGalleryTabs(owner: OwnerTarget, portraitProviders: ProviderCandidateInput[], bannerProviders: ProviderCandidateInput[]): MediaImageGalleryData["tabs"] {
	const portraitTab = buildImageGalleryTab(
		owner,
		"portrait",
		"Portrait",
		portraitProviders,
	);
	const bannerTab   = buildImageGalleryTab(
		owner,
		"banner",
		"Banner",
		bannerProviders,
	);

	return [
		portraitTab,
		bannerTab,
	];
}

function buildImageGalleryTab(owner: OwnerTarget, role: ImageGalleryRole, title: string, providerInputs: ProviderCandidateInput[]): MediaImageGalleryData["tabs"][number] {
	const imageRole          = mapGalleryRoleToImageRole(role);
	const activeSelection    = ImageGalleryDbFacade.getActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		imageRole,
	);
	const providerCandidates = providerInputs.map((candidate): ImageGalleryCandidate => ({
		candidateKey: createProviderCandidateKey(candidate.imageUrl),
		role,
		sourceKind:   "provider",
		label:        candidate.label,
		imageUrl:     candidate.imageUrl,
		...ImageCacheService.resolveProviderGalleryCandidate(
			owner.ownerKind,
			owner.ownerId,
			imageRole,
			candidate.imageUrl,
		),
	}));
	// Preserve active provider selections even when the current source row no longer
	// exposes that URL, otherwise edit modals appear empty while the list still has an image.
	const activeProviderCandidate = activeSelection?.sourceKind === "provider"
	&& !providerCandidates.some((candidate) => candidate.candidateKey === createProviderCandidateKey(activeSelection.sourceValue))
		? {
			candidateKey: createProviderCandidateKey(activeSelection.sourceValue),
			role,
			sourceKind:   "provider" as const,
			label:        `Selected ${ title.toLowerCase() }`,
			imageUrl:     activeSelection.sourceValue,
			...ImageCacheService.resolveProviderGalleryCandidate(
				owner.ownerKind,
				owner.ownerId,
				imageRole,
				activeSelection.sourceValue,
			),
		}
		: undefined;
	const uploadedCandidates = listUploadedImageGalleryCandidates(
		owner,
		role,
		activeSelection?.sourceKind === "user_upload"
			? activeSelection.sourceValue
			: undefined,
	);

	const explicitActiveKey  = activeSelection
		? activeSelection.sourceKind === "provider"
			? createProviderCandidateKey(activeSelection.sourceValue)
			: createUploadedCandidateKey(Number(activeSelection.sourceValue))
		: undefined;
	const activeCandidateKey = getDefaultActiveCandidateKey(
		role,
		activeProviderCandidate
			? [
				activeProviderCandidate,
				...providerCandidates,
			]
			: providerCandidates,
		uploadedCandidates,
		explicitActiveKey,
	);

	return {
		role,
		title,
		activeCandidateKey,
		candidates: [
			...uploadedCandidates,
			...(activeProviderCandidate ? [ activeProviderCandidate ] : []),
			...providerCandidates,
		],
	};
}

function listUploadedImageGalleryCandidates(owner: OwnerTarget, role: ImageGalleryRole, activeUploadSourceValue?: string): ImageGalleryCandidate[] {
	const imageRole      = mapGalleryRoleToImageRole(role);
	const uploadedImages = ImageGalleryDbFacade.listUploadedImages(
		owner.ownerKind,
		owner.ownerId,
		imageRole,
	);

	return uploadedImages.flatMap((uploadedImage) => {
		if (!existsSync(uploadedImage.localPath)) {
			ImageCacheService.deleteUploadedImageCache(uploadedImage);
			ImageGalleryDbFacade.deleteUploadedImageById(uploadedImage.id);
			if (activeUploadSourceValue === uploadedImage.id.toString()) {
				ImageGalleryDbFacade.clearActiveSelection(
					owner.ownerKind,
					owner.ownerId,
					imageRole,
				);
			}
			return [];
		}

		return [
			{
				candidateKey: createUploadedCandidateKey(uploadedImage.id),
				role,
				sourceKind:   "user_upload" as const,
				label:        `Uploaded ${ new Date(uploadedImage.createdAt).toLocaleString() }`,
				imageUrl:     uploadedImage.localPath,
				...ImageCacheService.resolveUploadedGalleryCandidate(uploadedImage.localPath),
			},
		];
	});
}
