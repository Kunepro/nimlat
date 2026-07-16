import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { MediaDownloadInspection } from "../../../types/media-download";

export function applyMediaDownloadIntegrationStatus(
	media: MediaDownloadInspection,
	integrationStatus: IntegrationStatus,
): MediaDownloadInspection {
	return media
		? {
			...media,
			integrationStatus,
		}
		: media;
}

export function formatMediaDownloadActionError(
	error: unknown,
	fallbackMessage: string,
): string {
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallbackMessage;
}
