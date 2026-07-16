// @vitest-environment node
import { of } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const acknowledgePendingExports = vi.fn();
const getAccountSecret          = vi.fn();
const listPendingExportItems    = vi.fn();
const logMainServiceError       = vi.fn();
const pushWatchedBatch          = vi.fn();
const streamWatchedBatchPush    = vi.fn();
const exportProgressNext        = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({ BUS_ExternalTrackingExportProgress: { next: exportProgressNext } }),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: {
				acknowledgePendingExports,
				getAccountSecret,
				listPendingExportItems,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: { logMainServiceError },
	}),
);

vi.mock(
	"./external-tracking-provider-clients",
	() => ({
		getExternalTrackingErrorMessage:   (error: Error) => error.message,
		getExternalTrackingProviderClient: (provider: string) => provider === "kitsu"
			? {
				pushWatchedBatch,
				streamWatchedBatchPush,
			}
			: { pushWatchedBatch },
	}),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		decryptExternalTrackingAccountSecret: (account: unknown) => account,
	}),
);

describe(
	"exportExternalTrackingProvider",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"rejects manual export when the provider is not connected",
			async () => {
				getAccountSecret.mockReturnValue(null);

				const { exportExternalTrackingProvider } = await import("./external-tracking-manual-export-service");
				const result                             = await exportExternalTrackingProvider("mal");

				expect(result).toEqual({
					success: false,
					message: "MyAnimeList is not connected.",
				});
				expect(listPendingExportItems).not.toHaveBeenCalled();
				expect(pushWatchedBatch).not.toHaveBeenCalled();
			},
		);

		it(
			"sends both watched and reset dirty states before acknowledging their revisions",
			async () => {
				const account       = {
					provider: "mal",
					status:   "connected",
				};
				const exportedItems = [
					{
						mediaId:               10,
						idMal:                 100,
						isWatched:             true,
						watchedEpisodeCount:   12,
						pendingExportRevision: 1,
					},
					{
						mediaId:               20,
						idMal:                 200,
						isWatched:             false,
						watchedEpisodeCount:   0,
						pendingExportRevision: 4,
					},
				];
				getAccountSecret.mockReturnValue(account);
				listPendingExportItems.mockReturnValue(exportedItems);
				pushWatchedBatch.mockResolvedValue(undefined);

				const { exportExternalTrackingProvider } = await import("./external-tracking-manual-export-service");
				const result                             = await exportExternalTrackingProvider("mal");

				expect(pushWatchedBatch).toHaveBeenCalledWith(
					account,
					exportedItems,
				);
				expect(acknowledgePendingExports).toHaveBeenCalledWith(
					"mal",
					exportedItems,
				);
				expect(result).toEqual({
					success: true,
					message: "Export complete: 2 anime updated on MyAnimeList.",
				});
			},
		);

		it(
			"publishes transient progress for the clicked Kitsu export",
			async () => {
				const account       = {
					provider: "kitsu",
					status:   "connected",
				};
				const exportedItems = [
					{
						mediaId:               10,
						idKitsu:               "100",
						isWatched:             true,
						watchedEpisodeCount:   12,
						pendingExportRevision: 1,
					},
					{
						mediaId:               20,
						idKitsu:               "200",
						isWatched:             false,
						watchedEpisodeCount:   0,
						pendingExportRevision: 2,
					},
				];
				getAccountSecret.mockReturnValue(account);
				listPendingExportItems.mockReturnValue(exportedItems);
				streamWatchedBatchPush.mockReturnValue(of(
					{
						completedItems: 1,
						totalItems:     2,
					},
					{
						completedItems: 2,
						totalItems:     2,
					},
				));

				const { exportExternalTrackingProvider } = await import("./external-tracking-manual-export-service");
				await exportExternalTrackingProvider("kitsu");

				expect(pushWatchedBatch).not.toHaveBeenCalled();
				expect(streamWatchedBatchPush).toHaveBeenCalledWith(
					account,
					exportedItems,
				);
				expect(exportProgressNext.mock.calls.map(([ event ]) => event)).toEqual([
					{
						provider:       "kitsu",
						completedItems: 0,
						totalItems:     2,
						active:         true,
					},
					{
						provider:       "kitsu",
						completedItems: 1,
						totalItems:     2,
						active:         true,
					},
					{
						provider:       "kitsu",
						completedItems: 2,
						totalItems:     2,
						active:         true,
					},
					{
						provider:       "kitsu",
						completedItems: 2,
						totalItems:     2,
						active:         false,
					},
				]);
			},
		);

		it(
			"reports an empty dirty set without calling the provider",
			async () => {
				getAccountSecret.mockReturnValue({
					provider: "mal",
					status:   "connected",
				});
				listPendingExportItems.mockReturnValue([]);

				const { exportExternalTrackingProvider } = await import("./external-tracking-manual-export-service");
				const result                             = await exportExternalTrackingProvider("mal");

				expect(result).toEqual({
					success: true,
					message: "No local watch-state changes to export to MyAnimeList.",
				});
				expect(pushWatchedBatch).not.toHaveBeenCalled();
				expect(acknowledgePendingExports).not.toHaveBeenCalled();
			},
		);

		it(
			"returns an immediate visible error when the provider request fails",
			async () => {
				getAccountSecret.mockReturnValue({
					provider: "mal",
					status:   "connected",
				});
				listPendingExportItems.mockReturnValue([
					{
						mediaId:               10,
						idMal:                 100,
						isWatched:             true,
						watchedEpisodeCount:   12,
						pendingExportRevision: 1,
					},
				]);
				pushWatchedBatch.mockRejectedValue(new Error("MAL request failed."));

				const { exportExternalTrackingProvider } = await import("./external-tracking-manual-export-service");
				const result                             = await exportExternalTrackingProvider("mal");

				expect(result).toEqual({
					success: false,
					message: "Export failed: MAL request failed.",
				});
				expect(logMainServiceError).toHaveBeenCalledWith(
					"external-tracking.exportProvider",
					expect.any(Error),
					{
						provider:  "mal",
						itemCount: 1,
					},
				);
				expect(acknowledgePendingExports).not.toHaveBeenCalled();
			},
		);
	},
);
