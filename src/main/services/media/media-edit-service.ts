import {
	BUS_GroupMediaItemsPatched,
	BUS_GroupMediaListChanged,
} from "@nimlat/busses/main";
import {
	AnimeDbFacade,
	ImageCacheDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { MediaDetailsSnapshotDto } from "@nimlat/types/anime-db";
import {
	MediaUpdateDetailsActionResult,
	ResetMediaDetailsRequest,
	SaveMediaEditRequest,
	UpdateMediaDetailsRequest,
} from "@nimlat/types/ipc-payloads";
import { Toaster } from "../../utils/toaster";
import { deleteOwnedMediaImageIfPresent } from "../group/group-image-storage-service";
import { ImageCacheService } from "../image-cache/image-cache-service";
import { ImageGalleryService } from "../image-cache/image-gallery-service";

// Handles manual local media metadata edits.
export class MediaEditService {
	public static updateDetails(request: UpdateMediaDetailsRequest): MediaUpdateDetailsActionResult {
		const nextName        = request.name.trim();
		const nextDescription = request.description?.trim() ?? "";
		try {
			this.persistDetails(
				request,
				nextName,
				nextDescription,
			);

			BUS_GroupMediaItemsPatched.next({
				patches: [
					{
						mediaId:     request.mediaId,
						name:        nextName,
						description: nextDescription,
					},
				],
			});
			BUS_GroupMediaListChanged.next({
				affectedMediaIds: [ request.mediaId ],
			});

			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"media-edit.update-details",
				tsError,
				{ mediaId: request.mediaId },
			);
			Toaster.error("Failed to update media.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Persist media text metadata and active image selections as one rollback-aware edit.
	// Uploaded image candidates are already durable; this commits only the chosen active image.
	public static saveEdit(request: SaveMediaEditRequest): MediaUpdateDetailsActionResult {
		const nextName        = request.name.trim();
		const nextDescription = request.description?.trim() ?? "";

		try {
			const previousOverride      = UserDbFacade.overrides.media.get(request.mediaId);
			const previousOfficialMedia = this.isAdminMode()
				? AnimeDbFacade.media.getDetailsSnapshot(request.mediaId)
				: null;
			const previousSelections = ImageGalleryService.getMediaSelectionSnapshot(request.mediaId);
			this.persistDetails(
				request,
				nextName,
				nextDescription,
			);
			try {
				ImageGalleryService.applyMediaSelections(
					request.mediaId,
					request.selections,
				);
				BUS_GroupMediaItemsPatched.next({
					patches: [
						{
							mediaId:     request.mediaId,
							name:        nextName,
							description: nextDescription,
						},
					],
				});
				BUS_GroupMediaListChanged.next({
					affectedMediaIds: [ request.mediaId ],
				});
			} catch (postDetailsError) {
				this.rollbackEdit(
					request,
					previousOverride,
					previousOfficialMedia,
					previousSelections,
				);
				throw postDetailsError;
			}
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"media-edit.save-edit",
				tsError,
				{ mediaId: request.mediaId },
			);
			Toaster.error("Failed to save media edit.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Drop local media metadata customization so the canonical AnimeDB media becomes visible again.
	public static resetDetails(request: ResetMediaDetailsRequest): MediaUpdateDetailsActionResult {
		try {
			const legacyUserLocalImage = ImageCacheDbFacade.getUserLocalImage(
				"media",
				request.mediaId.toString(),
				"primary",
			);

			UserDbFacade.overrides.media.delete(request.mediaId);
			ImageGalleryService.resetMediaSelections(request.mediaId);
			ImageCacheService.deleteMediaUserLocalImage(request.mediaId);
			if (legacyUserLocalImage?.localPath) {
				deleteOwnedMediaImageIfPresent(legacyUserLocalImage.localPath);
			}

			const sourceMedia = AnimeDbFacade.media.getDetailsSnapshot(request.mediaId);
			if (!sourceMedia) {
				throw new Error(`Media ${ request.mediaId } no longer exists in anime_data.`);
			}

			BUS_GroupMediaItemsPatched.next({
				patches: [
					{
						mediaId:            request.mediaId,
						name:               sourceMedia.name,
						description:        sourceMedia.description,
						imageUrl:           sourceMedia.imageUrl,
						displayImageUrl:    undefined,
						displayImageSource: undefined,
					},
				],
			});
			BUS_GroupMediaListChanged.next({
				affectedMediaIds: [ request.mediaId ],
			});

			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"media-edit.reset-details",
				tsError,
				{ mediaId: request.mediaId },
			);
			Toaster.error("Failed to reset media to source.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	private static persistDetails(request: UpdateMediaDetailsRequest, nextName: string, nextDescription: string): void {
		if (this.isAdminMode()) {
			// Admin media edits refine the distributable AnimeDB catalog instead of creating a user override.
			AnimeDbFacade.media.updateDetails(
				request.mediaId,
				{
					name:        nextName,
					description: nextDescription,
				},
			);
			return;
		}

		UserDbFacade.overrides.media.save({
			mediaId:        request.mediaId,
			name:           nextName,
			description:    nextDescription,
			customImageUrl: null,
			updatedAt:      Date.now(),
		});
	}

	private static rollbackEdit(
		request: SaveMediaEditRequest,
		previousOverride: ReturnType<typeof UserDbFacade.overrides.media.get>,
		previousOfficialMedia: MediaDetailsSnapshotDto | null,
		previousSelections: ReturnType<typeof ImageGalleryService.getMediaSelectionSnapshot>,
	): void {
		try {
			if (this.isAdminMode()) {
				if (!previousOfficialMedia) {
					throw new Error(`Cannot roll back missing official media ${ request.mediaId }.`);
				}
				AnimeDbFacade.media.updateDetails(
					request.mediaId,
					{
						name:        previousOfficialMedia.name,
						description: previousOfficialMedia.description,
					},
				);
			} else if (previousOverride) {
				UserDbFacade.overrides.media.save(previousOverride);
			} else {
				UserDbFacade.overrides.media.delete(request.mediaId);
			}
			ImageGalleryService.applyMediaSelections(
				request.mediaId,
				previousSelections,
			);
		} catch (rollbackError) {
			LoggerUtils.logMainServiceError(
				"media-edit.save-edit.rollback",
				typeSafeError(rollbackError),
				{ mediaId: request.mediaId },
			);
		}
	}

	private static isAdminMode(): boolean {
		return UserDbFacade.config.isAdminModeEnabled();
	}
}
