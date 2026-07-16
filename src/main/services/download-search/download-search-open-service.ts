import { buildDownloadSearchProviderUrl } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	DownloadSearchSettings,
	OpenDownloadSearchRequest,
	OpenDownloadSearchResult,
	SaveDownloadSearchBuilderStateRequest,
} from "@nimlat/types/download-search";
import {
	downloadSearchBrowserLauncher,
	type DownloadSearchBrowserLauncher,
} from "./download-search-browser-launcher";
import { downloadSearchSettingsService } from "./download-search-settings-service";

type DownloadSearchSettingsPort = {
	getSettings(): DownloadSearchSettings;
	saveBuilderState(request: SaveDownloadSearchBuilderStateRequest): void;
};

type DownloadSearchBrowserLauncherPort = Pick<DownloadSearchBrowserLauncher, "openUrl">;

type DownloadSearchOpenLogger = {
	logOpenError(scope: string, error: Error, details?: Record<string, unknown>): void;
};

const defaultLogger: DownloadSearchOpenLogger = {
	logOpenError: (scope, error, details) => LoggerUtils.logMainServiceError(
		scope,
		error,
		details,
	),
};

export class DownloadSearchOpenService {
	public constructor(
		private readonly settings: DownloadSearchSettingsPort               = downloadSearchSettingsService,
		private readonly browserLauncher: DownloadSearchBrowserLauncherPort = downloadSearchBrowserLauncher,
		private readonly logger: DownloadSearchOpenLogger                   = defaultLogger,
	) {}

	public async openProviderSearch(request: OpenDownloadSearchRequest): Promise<OpenDownloadSearchResult> {
		try {
			const settings = this.settings.getSettings();
			const provider = settings.providers.find((candidate) => candidate.id === request.providerId);
			if (!provider) {
				throw new Error(`Unknown download search provider '${ request.providerId }'.`);
			}
			if (!provider.enabled) {
				throw new Error(`Download search provider '${ provider.label }' is disabled.`);
			}

			const url = buildDownloadSearchProviderUrl(
				provider,
				request.query,
			);

			await this.browserLauncher.openUrl(
				settings.browserConfig,
				url,
			);

			this.saveLastUsedProviderIfMediaScoped(
				settings,
				request,
				provider.id,
			);

			return {
				success: true,
				url,
			};
		} catch (error) {
			this.logger.logOpenError(
				"download-search.open",
				error instanceof Error ? error : new Error("Failed to open download search."),
				{
					providerId: request.providerId,
					mediaId:    request.mediaId,
				},
			);
			return {
				success: false,
				error:   error instanceof Error ? error.message : "Failed to open download search.",
			};
		}
	}

	private saveLastUsedProviderIfMediaScoped(
		settings: DownloadSearchSettings,
		request: OpenDownloadSearchRequest,
		providerId: string,
	): void {
		// Builder state is global preference state; only media-scoped openings should
		// move the contextual provider pointer used by the media download explorer.
		if (typeof request.mediaId !== "number") {
			return;
		}
		this.settings.saveBuilderState({
			...settings.builderState,
			mediaId:            request.mediaId,
			lastUsedProviderId: providerId,
		});
	}
}

export const downloadSearchOpenService = new DownloadSearchOpenService();
