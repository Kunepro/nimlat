import {
	BUS_MediaEpisodesItemsPatched,
	BUS_MediaEpisodesListChanged,
} from "@nimlat/busses/main";
import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	EpisodeUpdateDetailsActionResult,
	ResetEpisodeDetailsRequest,
	SaveEpisodeEditRequest,
	UpdateEpisodeDetailsRequest,
} from "@nimlat/types/ipc-payloads";
import { Toaster } from "../../utils/toaster";
import { ImageGalleryService } from "../image-cache/image-gallery-service";

// Handles user-managed episode metadata overrides without mutating canonical provider data.
export class EpisodeEditService {
	public static updateDetails(request: UpdateEpisodeDetailsRequest): EpisodeUpdateDetailsActionResult {
		try {
			this.persistDetails(request);

			BUS_MediaEpisodesListChanged.next({ mediaId: request.mediaId });
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"episode-edit.update-details",
				tsError,
				{
					mediaId:       request.mediaId,
					episodeNumber: request.episodeNumber,
				},
			);
			Toaster.error("Failed to update episode.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Persist episode text metadata and the active thumbnail selection as one rollback-aware edit.
	public static saveEdit(request: SaveEpisodeEditRequest): EpisodeUpdateDetailsActionResult {
		try {
			const previousOverride   = UserDbFacade.overrides.episode.getMetadata(
				request.mediaId,
				request.episodeNumber,
			);
			const previousSelections = ImageGalleryService.getEpisodeSelectionSnapshot(
				request.mediaId,
				request.episodeNumber,
			);
			this.persistDetails(request);
			try {
				ImageGalleryService.applyEpisodeSelections(
					request.mediaId,
					request.episodeNumber,
					request.selections,
				);
				BUS_MediaEpisodesListChanged.next({ mediaId: request.mediaId });
			} catch (postDetailsError) {
				this.rollbackEdit(
					request,
					previousOverride,
					previousSelections,
				);
				throw postDetailsError;
			}
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"episode-edit.save-edit",
				tsError,
				{
					mediaId:       request.mediaId,
					episodeNumber: request.episodeNumber,
				},
			);
			Toaster.error("Failed to save episode edit.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Drop one local episode metadata override so the canonical AnimeDB episode becomes visible again.
	public static resetDetails(request: ResetEpisodeDetailsRequest): EpisodeUpdateDetailsActionResult {
		try {
			const sourceEpisode = AnimeDbFacade.media.getEpisodeDetailsSnapshot(
				request.mediaId,
				request.episodeNumber,
			);
			if (!sourceEpisode) {
				throw new Error(`Episode ${ request.episodeNumber } for media ${ request.mediaId } no longer exists in anime_data.`);
			}

			const previousOverride   = UserDbFacade.overrides.episode.getMetadata(
				request.mediaId,
				request.episodeNumber,
			);
			const previousSelections = ImageGalleryService.getEpisodeSelectionSnapshot(
				request.mediaId,
				request.episodeNumber,
			);
			try {
				UserDbFacade.overrides.episode.deleteMetadata(
					request.mediaId,
					request.episodeNumber,
				);
				ImageGalleryService.resetEpisodeSelections(
					request.mediaId,
					request.episodeNumber,
				);
			} catch (resetError) {
				this.rollbackEpisodeEditState(
					request,
					previousOverride,
					previousSelections,
					"episode-edit.reset-details.rollback",
				);
				throw resetError;
			}

			BUS_MediaEpisodesItemsPatched.next({
				mediaId: request.mediaId,
				patches: [
					{
						episodeNumber: request.episodeNumber,
						name:          sourceEpisode.name,
						description:   sourceEpisode.description,
						thumbnail:     sourceEpisode.thumbnail,
						aired:         sourceEpisode.aired,
						duration: sourceEpisode.duration,
						score:    sourceEpisode.score,
						filler:   sourceEpisode.filler,
						recap:    sourceEpisode.recap,
					},
				],
			});
			BUS_MediaEpisodesListChanged.next({ mediaId: request.mediaId });
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"episode-edit.reset-details",
				tsError,
				{
					mediaId:       request.mediaId,
					episodeNumber: request.episodeNumber,
				},
			);
			Toaster.error("Failed to reset episode to source.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	private static persistDetails(request: UpdateEpisodeDetailsRequest): void {
		const previousOverride = UserDbFacade.overrides.episode.getMetadata(
			request.mediaId,
			request.episodeNumber,
		);
		const nextName        = request.name?.trim() ?? "";
		const nextDescription = typeof request.description === "string"
			? request.description.trim()
			: previousOverride?.description ?? "";

		UserDbFacade.overrides.episode.saveMetadata({
			mediaId:       request.mediaId,
			episodeNumber: request.episodeNumber,
			name:        nextName || null,
			description: nextDescription || null,
			thumbnail:   previousOverride?.thumbnail ?? null,
			aired:       previousOverride?.aired ?? null,
			updatedAt: Date.now(),
		});
	}

	private static rollbackEdit(
		request: SaveEpisodeEditRequest,
		previousOverride: ReturnType<typeof UserDbFacade.overrides.episode.getMetadata>,
		previousSelections: ReturnType<typeof ImageGalleryService.getEpisodeSelectionSnapshot>,
	): void {
		this.rollbackEpisodeEditState(
			request,
			previousOverride,
			previousSelections,
			"episode-edit.save-edit.rollback",
		);
	}

	private static rollbackEpisodeEditState(
		target: Pick<ResetEpisodeDetailsRequest, "mediaId" | "episodeNumber">,
		previousOverride: ReturnType<typeof UserDbFacade.overrides.episode.getMetadata>,
		previousSelections: ReturnType<typeof ImageGalleryService.getEpisodeSelectionSnapshot>,
		eventName: string,
	): void {
		try {
			if (previousOverride) {
				UserDbFacade.overrides.episode.saveMetadata(previousOverride);
			} else {
				UserDbFacade.overrides.episode.deleteMetadata(
					target.mediaId,
					target.episodeNumber,
				);
			}
			ImageGalleryService.applyEpisodeSelections(
				target.mediaId,
				target.episodeNumber,
				previousSelections,
			);
		} catch (rollbackError) {
			LoggerUtils.logMainServiceError(
				eventName,
				typeSafeError(rollbackError),
				{
					mediaId:       target.mediaId,
					episodeNumber: target.episodeNumber,
				},
			);
		}
	}
}
