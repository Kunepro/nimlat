import { ImageGalleryDbFacade } from "@nimlat/database";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import { ImageCacheService } from "./image-cache-service";
import {
	createUploadedCandidateKey,
	mapGalleryRoleToImageRole,
	type OwnerTarget,
	parseUploadedCandidateKey,
} from "./image-gallery-model";

// Persist one uploaded file immediately and return its stable gallery candidate key.
// Selection is intentionally not changed here; callers decide whether the modal-local active image should move.
export function createUploadedImageGalleryCandidate(owner: OwnerTarget, role: ImageGalleryRole, sourceImagePath: string): string {
	let storedLocalPath: string | undefined;
	try {
		const imageRole = mapGalleryRoleToImageRole(role);
		storedLocalPath = owner.storeUpload(
			sourceImagePath,
			imageRole,
		);
		const uploadId  = ImageGalleryDbFacade.createUploadedImage({
			ownerKind: owner.ownerKind,
			ownerId:   owner.ownerId,
			imageRole,
			localPath: storedLocalPath,
		});
		return createUploadedCandidateKey(uploadId);
	} catch (error) {
		if (storedLocalPath) {
			owner.deleteOwnedImage(storedLocalPath);
		}
		throw error;
	}
}

export function deleteUploadedImageGalleryCandidate(owner: OwnerTarget, candidateKey: string): void {
	const uploadedId = parseUploadedCandidateKey(candidateKey);
	if (typeof uploadedId !== "number") {
		throw new Error("Only uploaded images can be deleted from the image gallery.");
	}

	const uploadedImage = ImageGalleryDbFacade.getUploadedImageById(uploadedId);
	if (!uploadedImage) {
		return;
	}
	if (uploadedImage.ownerKind !== owner.ownerKind || uploadedImage.ownerId !== owner.ownerId) {
		throw new Error("Uploaded image does not belong to this gallery owner.");
	}

	const activeSelection = ImageGalleryDbFacade.getActiveSelection(
		owner.ownerKind,
		owner.ownerId,
		uploadedImage.imageRole,
	);
	if (activeSelection?.sourceKind === "user_upload" && activeSelection.sourceValue === uploadedId.toString()) {
		ImageGalleryDbFacade.clearActiveSelection(
			owner.ownerKind,
			owner.ownerId,
			uploadedImage.imageRole,
		);
	}

	ImageCacheService.deleteUploadedImageCache(uploadedImage);
	ImageGalleryDbFacade.deleteUploadedImageById(uploadedId);
	owner.deleteOwnedImage(uploadedImage.localPath);
}
