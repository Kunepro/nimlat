import { ImageGalleryDbFacade } from "@nimlat/database";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGallerySelectionInput } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	createProviderCandidateKey,
	createUploadedCandidateKey,
	mapGalleryRoleToImageRole,
	type OwnerTarget,
	parseProviderCandidateKey,
	parseUploadedCandidateKey,
} from "./image-gallery-model";
import {
	createEpisodeOwnerTarget,
	createGroupOwnerTarget,
	createMediaOwnerTarget,
} from "./image-gallery-owner-targets";

export function getGroupSelectionSnapshot(group: GroupRef): ImageGallerySelectionInput[] {
	return createSelectionSnapshot(
		createGroupOwnerTarget(group),
		[
			"portrait",
			"banner",
		],
	);
}

export function getMediaSelectionSnapshot(mediaId: number): ImageGallerySelectionInput[] {
	return createSelectionSnapshot(
		createMediaOwnerTarget(mediaId),
		[
			"portrait",
			"banner",
		],
	);
}

export function getEpisodeSelectionSnapshot(mediaId: number, episodeNumber: number): ImageGallerySelectionInput[] {
	return createSelectionSnapshot(
		createEpisodeOwnerTarget(
			mediaId,
			episodeNumber,
		),
		[ "thumbnail" ],
	);
}

export function resetMediaSelections(mediaId: number): void {
	const owner = createMediaOwnerTarget(mediaId);
	ImageGalleryDbFacade.clearActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		"primary",
	);
	ImageGalleryDbFacade.clearActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		"banner",
	);
}

export function resetEpisodeSelections(mediaId: number, episodeNumber: number): void {
	const owner = createEpisodeOwnerTarget(
		mediaId,
		episodeNumber,
	);
	ImageGalleryDbFacade.clearActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		"thumbnail",
	);
}

export function applyGroupSelections(group: GroupRef, selections: ImageGallerySelectionInput[]): void {
	persistGallerySelections(
		createGroupOwnerTarget(group),
		selections,
	);
}

export function applyMediaSelections(mediaId: number, selections: ImageGallerySelectionInput[]): void {
	persistGallerySelections(
		createMediaOwnerTarget(mediaId),
		selections,
	);
}

export function applyEpisodeSelections(mediaId: number, episodeNumber: number, selections: ImageGallerySelectionInput[]): void {
	persistGallerySelections(
		createEpisodeOwnerTarget(
			mediaId,
			episodeNumber,
		),
		selections,
	);
}

function persistGallerySelections(owner: OwnerTarget, selections: ImageGallerySelectionInput[]): void {
	selections.forEach((selection) => {
		const imageRole = mapGalleryRoleToImageRole(selection.role);
		if (!selection.candidateKey) {
			ImageGalleryDbFacade.clearActiveSelection(
				owner.ownerKind,
				owner.ownerId,
				imageRole,
			);
			return;
		}

		const providerUrl = parseProviderCandidateKey(selection.candidateKey);
		if (providerUrl) {
			ImageGalleryDbFacade.setActiveSelection({
				ownerKind:   owner.ownerKind,
				ownerId:     owner.ownerId,
				imageRole,
				sourceKind:  "provider",
				sourceValue: providerUrl,
			});
			return;
		}

		const uploadedId = parseUploadedCandidateKey(selection.candidateKey);
		if (typeof uploadedId === "number") {
			ImageGalleryDbFacade.setActiveSelection({
				ownerKind:   owner.ownerKind,
				ownerId:     owner.ownerId,
				imageRole,
				sourceKind:  "user_upload",
				sourceValue: uploadedId.toString(),
			});
			return;
		}

		throw new Error(`Unsupported image candidate key: ${ selection.candidateKey }`);
	});
}

function createSelectionSnapshot(owner: OwnerTarget, roles: ImageGalleryRole[]): ImageGallerySelectionInput[] {
	return roles.map((role) => ({
		role,
		candidateKey: getCurrentCandidateKey(
			owner,
			role,
		),
	}));
}

function getCurrentCandidateKey(owner: OwnerTarget, role: ImageGalleryRole): string | undefined {
	const activeSelection = ImageGalleryDbFacade.getActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		mapGalleryRoleToImageRole(role),
	);
	if (!activeSelection) {
		return undefined;
	}

	return activeSelection.sourceKind === "provider"
		? createProviderCandidateKey(activeSelection.sourceValue)
		: createUploadedCandidateKey(Number(activeSelection.sourceValue));
}
