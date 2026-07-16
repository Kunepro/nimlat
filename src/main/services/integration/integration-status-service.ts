import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	IntegrationStatusActionResult,
	SaveEpisodeIntegrationStateRequest,
	SaveMediaIntegrationStateRequest,
	SetEpisodeIntegrationStatusesRequest,
	SetEpisodeIntegrationStatusRequest,
	SetGroupIntegrationStatusRequest,
	SetMediaIntegrationStatusRequest,
} from "@nimlat/types/ipc-payloads";
import { Toaster } from "../../utils/toaster";
import { LibrarySideEffectsCoordinator } from "../library/library-side-effects-coordinator";

function normalizeEpisodeNumbers(episodeNumbers: number[]): number[] {
	return Array.from(new Set(episodeNumbers.filter(Number.isInteger)));
}

// Coordinates integration status mutations while delegating renderer and Release Watch
// side effects to the shared coordinator.
export class IntegrationStatusService {
	public static setEpisodeStatus(request: SetEpisodeIntegrationStatusRequest): IntegrationStatusActionResult {
		try {
			const cascade = UserDbFacade.integration.episode.setStatus(
				request.mediaId,
				request.episodeNumber,
				request.integrationStatus,
			);
			LibrarySideEffectsCoordinator.handleIntegrationCascade(cascade);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"integration-status.set-episode",
				tsError,
				{ ...request },
			);
			Toaster.error("Failed to update episode integration status.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	public static setEpisodeStatuses(request: SetEpisodeIntegrationStatusesRequest): IntegrationStatusActionResult {
		const episodeNumbers = normalizeEpisodeNumbers(request.episodeNumbers);
		for (const episodeNumber of episodeNumbers) {
			// Keep the bulk endpoint on the same mutation path as single-row edits so
			// aggregate integration state and renderer invalidation rules cannot diverge.
			const result = this.setEpisodeStatus({
				mediaId: request.mediaId,
				episodeNumber,
				integrationStatus: request.integrationStatus,
			});

			if (!result.success) {
				return result;
			}
		}

		return { success: true };
	}

	// Persist the full episode integration/playback state so the renderer can submit
	// one coherent edit without duplicating cascade logic locally.
	public static saveEpisodeState(request: SaveEpisodeIntegrationStateRequest): IntegrationStatusActionResult {
		try {
			const cascade = UserDbFacade.integration.episode.saveState(
				{
					mediaId:           request.mediaId,
					episodeNumber:     request.episodeNumber,
					integrationStatus: request.integrationStatus,
					playbackIssueNote: request.playbackIssueNote,
					hasDubIssue:       request.hasDubIssue ? 1 : 0,
					hasSubIssue:       request.hasSubIssue ? 1 : 0,
					hasEncodingIssue:  request.hasEncodingIssue ? 1 : 0,
					hasAudioIssue:     request.hasAudioIssue ? 1 : 0,
					hasVideoIssue:     request.hasVideoIssue ? 1 : 0,
					updatedAt:         Date.now(),
				},
				request.playbackIssueMoments.map((moment) => ({
					mediaId:               request.mediaId,
					episodeNumber:         request.episodeNumber,
					playbackIssueCategory: moment.playbackIssueCategory,
					timeSeconds:           moment.timeSeconds,
					note:                  moment.note,
					updatedAt:             Date.now(),
				})),
			);
			LibrarySideEffectsCoordinator.handleIntegrationCascade(cascade);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"integration-status.save-episode",
				tsError,
				{ ...request },
			);
			Toaster.error("Failed to update episode integration state.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	public static setMediaStatus(request: SetMediaIntegrationStatusRequest): IntegrationStatusActionResult {
		try {
			const cascade = UserDbFacade.integration.media.setStatus(
				request.mediaId,
				request.integrationStatus,
			);
			LibrarySideEffectsCoordinator.handleIntegrationCascade(cascade);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"integration-status.set-media",
				tsError,
				{ ...request },
			);
			Toaster.error("Failed to update media integration status.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Persist the full media integration/playback state and cascade the derived
	// integration percentages through its episodes and parent Groups.
	public static saveMediaState(request: SaveMediaIntegrationStateRequest): IntegrationStatusActionResult {
		try {
			const updatedAt = Date.now();
			const cascade   = UserDbFacade.integration.media.saveStateWithMoments(
				{
					mediaId:           request.mediaId,
					integrationStatus: request.integrationStatus,
					playbackIssueNote: request.playbackIssueNote,
					hasDubIssue:       request.hasDubIssue ? 1 : 0,
					hasSubIssue:       request.hasSubIssue ? 1 : 0,
					hasEncodingIssue:  request.hasEncodingIssue ? 1 : 0,
					hasAudioIssue:     request.hasAudioIssue ? 1 : 0,
					hasVideoIssue:     request.hasVideoIssue ? 1 : 0,
					updatedAt,
				},
				(request.playbackIssueMoments || []).map((moment) => ({
					mediaId:               request.mediaId,
					playbackIssueCategory: moment.playbackIssueCategory,
					timeSeconds:           moment.timeSeconds,
					note:                  moment.note,
					updatedAt,
				})),
			);
			LibrarySideEffectsCoordinator.handleIntegrationCascade(cascade);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"integration-status.save-media",
				tsError,
				{ ...request },
			);
			Toaster.error("Failed to update media integration state.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	public static setGroupStatus(request: SetGroupIntegrationStatusRequest): IntegrationStatusActionResult {
		try {
			const cascade = UserDbFacade.integration.group.setStatusForGroupRef(
				request.group,
				request.integrationStatus,
			);
			LibrarySideEffectsCoordinator.handleIntegrationCascade(cascade);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"integration-status.set-group",
				tsError,
				{ ...request },
			);
			Toaster.error("Failed to update group integration status.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}
}
