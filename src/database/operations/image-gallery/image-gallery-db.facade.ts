import {
	ActiveImageSelectionDto,
	ImageOwnerKind,
	ImageRole,
	UserUploadedImageEntryDto,
} from "@nimlat/types/anime-db";
import { runDatabaseFacadeOperation } from "../database-facade-utils";
import { deleteActiveImageSelection } from "./delete-active-image-selection";
import { deleteUserUploadedImageById } from "./delete-user-uploaded-image-by-id";
import { insertUserUploadedImage } from "./insert-user-uploaded-image";
import { selectActiveImageSelection } from "./select-active-image-selection";
import { selectUserUploadedImageById } from "./select-user-uploaded-image-by-id";
import { selectUserUploadedImagesByOwner } from "./select-user-uploaded-images-by-owner";
import { upsertActiveImageSelection } from "./upsert-active-image-selection";

// DB boundary for selectable uploaded images and active image selections.
// Provider candidates stay derived in main-process services; this facade only persists app-owned state.
export class ImageGalleryDbFacade {
	public static listUploadedImages(
		ownerKind: ImageOwnerKind,
		ownerId: string,
		imageRole: ImageRole,
	): UserUploadedImageEntryDto[] {
		return runDatabaseFacadeOperation(
			"image-gallery-db.facade.listUploadedImages",
			() => selectUserUploadedImagesByOwner(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}

	public static getUploadedImageById(id: number): UserUploadedImageEntryDto | null {
		return runDatabaseFacadeOperation(
			"image-gallery-db.facade.getUploadedImageById",
			() => selectUserUploadedImageById(id),
			{ id },
		);
	}

	public static createUploadedImage(input: {
		ownerKind: ImageOwnerKind;
		ownerId: string;
		imageRole: ImageRole;
		localPath: string;
	}): number {
		return runDatabaseFacadeOperation(
			"image-gallery-db.facade.createUploadedImage",
			() => insertUserUploadedImage(input),
			input,
		);
	}

	public static deleteUploadedImageById(id: number): void {
		runDatabaseFacadeOperation(
			"image-gallery-db.facade.deleteUploadedImageById",
			() => deleteUserUploadedImageById(id),
			{ id },
		);
	}

	public static getActiveSelection(
		ownerKind: ImageOwnerKind,
		ownerId: string,
		imageRole: ImageRole,
	): ActiveImageSelectionDto | null {
		return runDatabaseFacadeOperation(
			"image-gallery-db.facade.getActiveSelection",
			() => selectActiveImageSelection(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}

	public static setActiveSelection(input: {
		ownerKind: ImageOwnerKind;
		ownerId: string;
		imageRole: ImageRole;
		sourceKind: ActiveImageSelectionDto["sourceKind"];
		sourceValue: string;
	}): void {
		runDatabaseFacadeOperation(
			"image-gallery-db.facade.setActiveSelection",
			() => upsertActiveImageSelection(input),
			input,
		);
	}

	public static clearActiveSelection(ownerKind: ImageOwnerKind, ownerId: string, imageRole: ImageRole): void {
		runDatabaseFacadeOperation(
			"image-gallery-db.facade.clearActiveSelection",
			() => deleteActiveImageSelection(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}
}
