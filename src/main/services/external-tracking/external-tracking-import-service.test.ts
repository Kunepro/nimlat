// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const accountsChangedNext  = vi.fn();
const groupListChangedNext          = vi.fn();
const groupMediaChangedNext         = vi.fn();
const groupMediaItemsPatchedNext    = vi.fn();
const mediaEpisodesItemsPatchedNext = vi.fn();
const watchListChangedNext = vi.fn();
const getAccountSecret     = vi.fn();
const applyImport          = vi.fn();
const markAccountError     = vi.fn();
const importWatched        = vi.fn();
const logMainServiceError  = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_ExternalTrackingAccountsChanged: {
			next: accountsChangedNext,
		},
		BUS_GroupListChanged:          {
			next: groupListChangedNext,
		},
		BUS_GroupMediaListChanged:     {
			next: groupMediaChangedNext,
		},
		BUS_GroupMediaItemsPatched:    {
			next: groupMediaItemsPatchedNext,
		},
		BUS_MediaEpisodesItemsPatched: {
			next: mediaEpisodesItemsPatchedNext,
		},
		BUS_MediaWatchListChanged:           {
			next: watchListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: {
				getAccountSecret,
				applyImport,
				markAccountError,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

vi.mock(
	"./external-tracking-provider-clients",
	() => ({
		getExternalTrackingErrorMessage:   (error: unknown) => error instanceof Error ? error.message : String(error),
		getExternalTrackingProviderClient: () => ({ importWatched }),
	}),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		decryptExternalTrackingAccountSecret: (account: unknown) => account,
	}),
);

describe(
	"importExternalTrackingProvider",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"imports watched state and invalidates Library and Group readers",
			async () => {
				getAccountSecret.mockReturnValue({
					provider: "mal",
					status:   "connected",
				});
				importWatched.mockResolvedValue([
					{ mediaId: 1 },
					{ mediaId: 2 },
				]);
				applyImport.mockReturnValue({
					importedItems:     2,
					matchedItems:      2,
					localUpdatedItems: 1,
					changedMediaIds:   [
						1,
						2,
					],
					changedMediaWatchStates:   [
						{
							mediaId:   1,
							isWatched: true,
						},
						{
							mediaId:   2,
							isWatched: false,
						},
					],
					changedEpisodeWatchStates: [
						{
							mediaId:       1,
							episodeNumber: 4,
							isWatched:     true,
						},
					],
				});

				const { importExternalTrackingProvider } = await import("./external-tracking-import-service");
				const result                             = await importExternalTrackingProvider("mal");

				expect(watchListChangedNext).toHaveBeenCalledWith({
					mediaIds: [
						1,
						2,
					],
				});
				expect(groupMediaChangedNext).toHaveBeenCalledWith({
					affectedMediaIds: [
						1,
						2,
					],
				});
				expect(groupMediaItemsPatchedNext).toHaveBeenCalledWith({
					patches: [
						{
							mediaId:   1,
							isWatched: true,
						},
						{
							mediaId:   2,
							isWatched: false,
						},
					],
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(mediaEpisodesItemsPatchedNext).toHaveBeenCalledWith({
					mediaId: 1,
					patches: [
						{
							episodeNumber: 4,
							isWatched:     true,
						},
					],
				});
				expect(accountsChangedNext).toHaveBeenCalledWith({ provider: "mal" });
				expect(result).toEqual({
					success:           true,
					message: "Import complete: matched 2 of 2 anime in your Nimlat library.",
					importedItems:     2,
					matchedItems:      2,
					localUpdatedItems: 1,
				});
			},
		);

		it(
			"imports one-shot items without marking an existing account for reconnection",
			async () => {
				applyImport.mockReturnValue({
					importedItems:             1,
					matchedItems:              1,
					localUpdatedItems:         1,
					changedMediaIds:           [ 5 ],
					changedMediaWatchStates:   [
						{
							mediaId:   5,
							isWatched: true,
						},
					],
					changedEpisodeWatchStates: [],
				});
				const { importExternalTrackingFromLoader } = await import("./external-tracking-import-service");

				await expect(importExternalTrackingFromLoader(
					"kitsu",
					() => Promise.resolve([
						{
							providerMediaId:     null,
							idMal:               1535,
							isWatched:           true,
							watchedEpisodeCount: 37,
						},
					]),
					"external-tracking.importKitsuXml",
				)).resolves.toMatchObject({
					success:       true,
					importedItems: 1,
				});
				expect(markAccountError).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps failed imports observable through account state and logging",
			async () => {
				getAccountSecret.mockReturnValue(null);

				const { importExternalTrackingProvider } = await import("./external-tracking-import-service");
				const result                             = await importExternalTrackingProvider("simkl");

				expect(markAccountError).toHaveBeenCalledWith(
					"simkl",
					"Simkl is not connected.",
				);
				expect(logMainServiceError).toHaveBeenCalledWith(
					"external-tracking.importProvider",
					expect.any(Error),
					{ provider: "simkl" },
				);
				expect(accountsChangedNext).toHaveBeenCalledWith({ provider: "simkl" });
				expect(result).toEqual({
					success:           false,
					message:           "Simkl is not connected.",
					importedItems:     0,
					matchedItems:      0,
					localUpdatedItems: 0,
				});
			},
		);

		it(
			"normalizes non-Error provider failures before logging",
			async () => {
				getAccountSecret.mockReturnValue({
					provider: "anilist",
					status:   "connected",
				});
				importWatched.mockRejectedValue("provider string failure");

				const { importExternalTrackingProvider } = await import("./external-tracking-import-service");
				const result                             = await importExternalTrackingProvider("anilist");

				expect(result).toMatchObject({
					success: false,
					message: "provider string failure",
				});
				expect(markAccountError).toHaveBeenCalledWith(
					"anilist",
					"provider string failure",
				);
				expect(logMainServiceError).toHaveBeenCalledWith(
					"external-tracking.importProvider",
					expect.objectContaining({ message: "provider string failure" }),
					{ provider: "anilist" },
				);
			},
		);
	},
);
