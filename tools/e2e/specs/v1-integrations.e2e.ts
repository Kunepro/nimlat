import {
	expect,
	test,
} from "@playwright/test";
import {
	callRendererApi,
	readRendererEvents,
	startRendererEventRecorder,
	stopRendererEventRecorder,
} from "../e2e-renderer-api";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import {
	runMainCommand,
	wait,
} from "../playwright-electron-helpers";

export function registerV1IntegrationTests(context: NimlatE2ETestContext): void {
	test(
		"Kitsu supports public, XML, and password import paths without real network",
		async () => {
			const basePage    = context.getBasePage();
			const electronApp = context.getElectronApp();
			const { ids }     = context.getSnapshot();

			await runMainCommand(
				electronApp,
				"installMockKitsuTrackingFetch",
			);
			await startRendererEventRecorder(
				basePage,
				"groupMediaItemsPatched",
			);
			await startRendererEventRecorder(
				basePage,
				"groupMediaListChanged",
			);
			await startRendererEventRecorder(
				basePage,
				"groupListChanged",
			);
			const publicResult = await callRendererApi(
				basePage,
				"externalTracking",
				"importKitsuPublic",
				{
					provider: "kitsu",
					username: "e2e-kitsu-user",
				},
			);
			expect(publicResult.success).toBe(true);
			expect(publicResult.matchedItems).toBe(1);
			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"groupMediaItemsPatched",
				);
				return events.some(event => event.patches.some(patch => (
					patch.mediaId === ids.missingMalMedia
					&& patch.isWatched === true
				)));
			}).toBe(true);
			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"groupMediaListChanged",
				);
				return events.some(event => event.affectedMediaIds.includes(ids.missingMalMedia));
			}).toBe(true);
			await expect.poll(async () => (await readRendererEvents(
				basePage,
				"groupListChanged",
			)).length).toBeGreaterThan(0);
			await stopRendererEventRecorder(
				basePage,
				"groupMediaItemsPatched",
			);
			await stopRendererEventRecorder(
				basePage,
				"groupMediaListChanged",
			);
			await stopRendererEventRecorder(
				basePage,
				"groupListChanged",
			);

			await runMainCommand(
				electronApp,
				"installMockKitsuXmlDialog",
			);
			const xmlResult = await callRendererApi(
				basePage,
				"externalTracking",
				"importKitsuXml",
			);
			expect(xmlResult.success).toBe(true);
			expect(xmlResult.matchedItems).toBe(1);
			const settingsAfterXml    = await callRendererApi(
				basePage,
				"externalTracking",
				"getSettings",
			);
			const kitsuImportActivity = settingsAfterXml.accounts.find(candidate => candidate.provider === "kitsu");
			expect(kitsuImportActivity?.status).toBe("available");
			expect(kitsuImportActivity?.publicProfileIdentifier).toBe("e2e-kitsu-user");
			expect(kitsuImportActivity?.lastImportedAt).toEqual(expect.any(Number));

			const account = await callRendererApi(
				basePage,
				"externalTracking",
				"connectKitsu",
				{
					provider: "kitsu",
					email:    "e2e-kitsu@example.com",
					password: "e2e-kitsu-password",
				},
			);
			expect(account.status).toBe("connected");
			expect(account.capabilities.authKind).toBe("password");

			const importResult = await callRendererApi(
				basePage,
				"externalTracking",
				"importProvider",
				"kitsu",
			);
			expect(
				importResult.success,
				importResult.message,
			).toBe(true);
			expect(importResult.importedItems).toBe(1);
			expect(importResult.matchedItems).toBe(1);

			// Keep the serial integration suite provider-isolated so later cases can
			// verify their own connected-account behavior independently.
			await callRendererApi(
				basePage,
				"externalTracking",
				"disconnect",
				"kitsu",
			);
		},
	);

	test(
		"AniList watch-list import updates local watch state without real network",
		async () => {
			const basePage    = context.getBasePage();
			const electronApp = context.getElectronApp();
			const { ids }     = context.getSnapshot();

			await runMainCommand(
				electronApp,
				"installMockExternalTrackingFetch",
			);
			await startRendererEventRecorder(
				basePage,
				"externalTrackingAccountsChanged",
			);

			const account = await callRendererApi(
				basePage,
				"externalTracking",
				"saveImplicitToken",
				{
					provider:           "anilist",
					clientId:           "",
					tokenOrRedirectUrl: "e2e-anilist-token",
					expiresInSeconds:   3600,
				},
			);
			expect(account.provider).toBe("anilist");
			expect(account.status).toBe("connected");

			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"externalTrackingAccountsChanged",
				);
				return events.some((event) => event.provider === "anilist");
			}).toBe(true);

			const importResult = await callRendererApi(
				basePage,
				"externalTracking",
				"importProvider",
				"anilist",
			);
			expect(
				importResult.success,
				importResult.message,
			).toBe(true);
			expect(importResult.importedItems).toBe(1);
			expect(importResult.matchedItems).toBe(1);
			expect(importResult.localUpdatedItems).toBeGreaterThanOrEqual(1);

			const mediaInspection = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.relatedMedia,
			);
			expect(mediaInspection?.isWatched).toBe(true);

			const settings       = await callRendererApi(
				basePage,
				"externalTracking",
				"getSettings",
			);
			const aniListAccount = settings.accounts.find((candidate) => candidate.provider === "anilist");
			expect(aniListAccount?.status).toBe("connected");

			await stopRendererEventRecorder(
				basePage,
				"externalTrackingAccountsChanged",
			);
		},
	);

	test(
		"AniList watch-list import failure marks the account for reconnect without mutating local watch state",
		async () => {
			const basePage     = context.getBasePage();
			const electronApp  = context.getElectronApp();
			const { ids }      = context.getSnapshot();
			const errorMessage = "E2E mocked AniList import failure";

			const mediaBefore = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.filmMedia,
			);

			await runMainCommand(
				electronApp,
				"installMockExternalTrackingFetchFailure",
				[ errorMessage ],
			);
			await startRendererEventRecorder(
				basePage,
				"externalTrackingAccountsChanged",
			);

			const account = await callRendererApi(
				basePage,
				"externalTracking",
				"saveImplicitToken",
				{
					provider:           "anilist",
					clientId:           "",
					tokenOrRedirectUrl: "e2e-anilist-failing-token",
					expiresInSeconds:   3600,
				},
			);
			expect(account.provider).toBe("anilist");
			expect(account.status).toBe("connected");

			const importResult = await callRendererApi(
				basePage,
				"externalTracking",
				"importProvider",
				"anilist",
			);
			expect(importResult.success).toBe(false);
			expect(importResult.message).toContain(errorMessage);
			expect(importResult.localUpdatedItems).toBe(0);

			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"externalTrackingAccountsChanged",
				);
				return events.filter((event) => event.provider === "anilist").length;
			}).toBeGreaterThanOrEqual(2);

			const settings       = await callRendererApi(
				basePage,
				"externalTracking",
				"getSettings",
			);
			const aniListAccount = settings.accounts.find((candidate) => candidate.provider === "anilist");
			expect(aniListAccount?.status).toBe("needs_reconnect");
			expect(aniListAccount?.lastError).toContain(errorMessage);

			const exportResult = await callRendererApi(
				basePage,
				"externalTracking",
				"exportProvider",
				"anilist",
			);
			expect(exportResult.success).toBe(false);
			expect(exportResult.message).toContain("AniList is not connected.");

			const mediaAfter = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.filmMedia,
			);
			expect(mediaAfter?.isWatched).toBe(mediaBefore?.isWatched);

			await stopRendererEventRecorder(
				basePage,
				"externalTrackingAccountsChanged",
			);
		},
	);

	test(
		"AniList export retries failures and drains watched-to-unwatched changes exactly once",
		async () => {
			const basePage     = context.getBasePage();
			const electronApp  = context.getElectronApp();
			const { ids }      = context.getSnapshot();
			const errorMessage = "E2E mocked AniList push failure";

			await runMainCommand(
				electronApp,
				"installMockExternalTrackingPushFailure",
				[ errorMessage ],
			);
			const account = await callRendererApi(
				basePage,
				"externalTracking",
				"saveImplicitToken",
				{
					provider:           "anilist",
					clientId:           "",
					tokenOrRedirectUrl: "e2e-anilist-push-token",
					expiresInSeconds:   3600,
				},
			);
			expect(account.status).toBe("connected");

			const watchResult = await callRendererApi(
				basePage,
				"groupExplorer",
				"setMediaWatchState",
				{
					mediaIds:  [ ids.filmMedia ],
					isWatched: true,
				},
			);
			if (!watchResult.success) {
				throw new Error(watchResult.error);
			}
			expect(watchResult.changedMediaIds).toContain(ids.filmMedia);

			const failedExport = await callRendererApi(
				basePage,
				"externalTracking",
				"exportProvider",
				"anilist",
			);
			expect(failedExport.success).toBe(false);
			expect(failedExport.message).toContain(errorMessage);

			const mediaAfterFailure = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.filmMedia,
			);
			expect(mediaAfterFailure?.isWatched).toBe(true);

			await runMainCommand(
				electronApp,
				"installMockExternalTrackingFetch",
			);
			const successfulExport = await callRendererApi(
				basePage,
				"externalTracking",
				"exportProvider",
				"anilist",
			);
			expect(
				successfulExport.success,
				successfulExport.message,
			).toBe(true);
			expect(successfulExport.message).toContain("Export complete");

			const unwatchResult = await callRendererApi(
				basePage,
				"groupExplorer",
				"setMediaWatchState",
				{
					mediaIds:  [ ids.filmMedia ],
					isWatched: false,
				},
			);
			if (!unwatchResult.success) {
				throw new Error(unwatchResult.error);
			}
			expect(unwatchResult.changedMediaIds).toContain(ids.filmMedia);

			const resetExport = await callRendererApi(
				basePage,
				"externalTracking",
				"exportProvider",
				"anilist",
			);
			expect(
				resetExport.success,
				resetExport.message,
			).toBe(true);
			expect(resetExport.message).toContain("Export complete: 1 anime");

			const emptyExport = await callRendererApi(
				basePage,
				"externalTracking",
				"exportProvider",
				"anilist",
			);
			expect(emptyExport).toEqual({
				success: true,
				message: "No local watch-state changes to export to AniList.",
			});
		},
	);

	test(
		"AnimeDB incremental update ingests provider changes without real network",
		async () => {
			const basePage          = context.getBasePage();
			const electronApp       = context.getElectronApp();
			const { ids }           = context.getSnapshot();
			const updateDescription = "E2E AnimeDB incremental update media";

			await runMainCommand(
				electronApp,
				"prepareAnimeDbIncrementalUpdateMedia",
				[ updateDescription ],
			);
			await startRendererEventRecorder(
				basePage,
				"animeDbUpdateProgress",
			);

			const inspectionBefore = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.animeDbUpdateMedia,
			);
			expect(inspectionBefore).toBeNull();

			const startResult = await callRendererApi(
				basePage,
				"animeDbUpdate",
				"start",
			);
			expect(
				startResult.success,
				startResult.success ? undefined : startResult.error,
			).toBe(true);

			await expect.poll(async () => {
				const status = await callRendererApi(
					basePage,
					"animeDbUpdate",
					"getStatus",
				);
				return status.status;
			}).toBe("completed");

			const finalStatus = await callRendererApi(
				basePage,
				"animeDbUpdate",
				"getStatus",
			);
			expect(finalStatus.phase).toBe("completed");
			expect(finalStatus.processedMedias).toBeGreaterThanOrEqual(1);
			expect(finalStatus.lastSuccessfulProviderUpdatedAt).not.toBeNull();

			await expect.poll(async () => {
				const progressEvents = await readRendererEvents(
					basePage,
					"animeDbUpdateProgress",
				);
				return {
					completed: progressEvents.some((event) => event.status === "completed"),
					running:   progressEvents.some((event) => event.status === "running"),
				};
			}).toEqual({
				completed: true,
				running:   true,
			});

			const inspectionAfter = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.animeDbUpdateMedia,
			);
			expect(inspectionAfter?.mediaId).toBe(ids.animeDbUpdateMedia);
			expect(inspectionAfter?.description).toBe(updateDescription);

			const cooldownStartResult = await callRendererApi(
				basePage,
				"animeDbUpdate",
				"start",
			);
			expect(
				cooldownStartResult.success,
				cooldownStartResult.success ? undefined : cooldownStartResult.error,
			).toBe(true);
			const cooldownStatus = await callRendererApi(
				basePage,
				"animeDbUpdate",
				"getStatus",
			);
			expect(cooldownStatus.cooldownEndsAt).toBeGreaterThan(Date.now());

			await stopRendererEventRecorder(
				basePage,
				"animeDbUpdateProgress",
			);
		},
	);

	test(
		"GitHub-release AnimeDB download reports availability and replaces the DB without real network",
		async () => {
			const basePage       = context.getBasePage();
			const electronApp    = context.getElectronApp();
			const { ids }        = context.getSnapshot();
			const releaseVersion = "e2e-github-anime-db-v1";

			await runMainCommand(
				electronApp,
				"installMockAnimeDbReleaseDownload",
				[ releaseVersion ],
			);
			await startRendererEventRecorder(
				basePage,
				"animeDbDownloadProgress",
			);

			const releaseBefore = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getReleaseStatus",
			);
			expect(releaseBefore.latestVersion).toBe(releaseVersion);
			expect(releaseBefore.updateAvailable).toBe(true);

			const startResult = await callRendererApi(
				basePage,
				"animeDbDownload",
				"start",
			);
			expect(
				startResult.success,
				startResult.success ? undefined : startResult.error,
			).toBe(true);

			await expect.poll(async () => {
				const status = await callRendererApi(
					basePage,
					"animeDbDownload",
					"getStatus",
				);
				return status.status;
			}).toBe("completed");

			const finalStatus = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getStatus",
			);
			expect(finalStatus.version).toBe(releaseVersion);
			expect(finalStatus.percent).toBe(1);

			const progressEvents = await readRendererEvents(
				basePage,
				"animeDbDownloadProgress",
			);
			expect(progressEvents.some((event) => event.status === "downloading")).toBe(true);
			expect(progressEvents.some((event) => event.status === "completed")).toBe(true);

			const releaseAfter = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getReleaseStatus",
			);
			expect(releaseAfter.installedVersion).toBe(releaseVersion);
			expect(releaseAfter.latestVersion).toBe(releaseVersion);
			expect(releaseAfter.updateAvailable).toBe(false);

			await wait(50);
			const postReplaceInspection = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.relatedMedia,
			);
			expect(postReplaceInspection?.mediaId).toBe(ids.relatedMedia);

			await stopRendererEventRecorder(
				basePage,
				"animeDbDownloadProgress",
			);
		},
	);

	test(
		"AnimeDB download reconciliation rolls back atomically and retries without another download",
		async () => {
			const basePage       = context.getBasePage();
			const electronApp    = context.getElectronApp();
			const {
							ids,
							groupIds,
						}              = context.getSnapshot();
			const fromVersion    = "e2e-auto-reconcile-v1";
			const releaseVersion = "e2e-auto-reconcile-v2";
			let recorderStarted  = false;

			await runMainCommand(
				electronApp,
				"prepareAutomaticDownloadReconcileRollback",
				[ fromVersion ],
			);
			await runMainCommand(
				electronApp,
				"installMockAnimeDbReleaseDownload",
				[ releaseVersion ],
			);

			try {
				await startRendererEventRecorder(
					basePage,
					"animeDbDownloadProgress",
				);
				recorderStarted = true;

				const failedStart = await callRendererApi(
					basePage,
					"animeDbDownload",
					"start",
				);
				if (failedStart.success) {
					throw new Error("Expected the injected second reconcile import to fail.");
				}
				expect(failedStart.error).toContain("E2E forced second reconcile import failure");

				const failedStatus = await callRendererApi(
					basePage,
					"animeDbDownload",
					"getStatus",
				);
				expect(failedStatus).toMatchObject({
					status:  "reconcile_error",
					version: releaseVersion,
				});
				const releaseAfterFailure = await callRendererApi(
					basePage,
					"animeDbDownload",
					"getReleaseStatus",
				);
				expect(releaseAfterFailure.installedVersion).toBe(releaseVersion);

				const failedReconcileState = await runMainCommand(
					electronApp,
					"getUserGroupingReconcileState",
				);
				expect(failedReconcileState).toEqual({
					lastReconciledAnimeDbVersion: releaseVersion,
					lastReconcileStatus:          "failed",
				});
				await expect(runMainCommand(
					electronApp,
					"getUserGroupContainsMedia",
					[
						groupIds.sourceGroupId,
						ids.reconcileRollbackFirstMedia,
					],
				)).resolves.toBe(false);
				await expect(runMainCommand(
					electronApp,
					"getUserGroupContainsMedia",
					[
						groupIds.targetGroupId,
						ids.reconcileRollbackSecondMedia,
					],
				)).resolves.toBe(false);
				await expect(runMainCommand(
					electronApp,
					"getMockAnimeDbReleaseDownloadCount",
				)).resolves.toBe(1);

				await stopRendererEventRecorder(
					basePage,
					"animeDbDownloadProgress",
				);
				recorderStarted = false;
				await runMainCommand(
					electronApp,
					"dropAutomaticDownloadReconcileFailureTrigger",
				);
				await startRendererEventRecorder(
					basePage,
					"animeDbDownloadProgress",
				);
				recorderStarted = true;

				const retryResult = await callRendererApi(
					basePage,
					"animeDbDownload",
					"start",
				);
				expect(
					retryResult.success,
					retryResult.success ? undefined : retryResult.error,
				).toBe(true);

				await expect(runMainCommand(
					electronApp,
					"getUserGroupContainsMedia",
					[
						groupIds.sourceGroupId,
						ids.reconcileRollbackFirstMedia,
					],
				)).resolves.toBe(true);
				await expect(runMainCommand(
					electronApp,
					"getUserGroupContainsMedia",
					[
						groupIds.targetGroupId,
						ids.reconcileRollbackSecondMedia,
					],
				)).resolves.toBe(true);
				const completedReconcileState = await runMainCommand(
					electronApp,
					"getUserGroupingReconcileState",
				);
				expect(completedReconcileState).toEqual({
					lastReconciledAnimeDbVersion: releaseVersion,
					lastReconcileStatus:          "completed",
				});
				await expect(runMainCommand(
					electronApp,
					"getMockAnimeDbReleaseDownloadCount",
				)).resolves.toBe(1);

				const retryEvents = await readRendererEvents(
					basePage,
					"animeDbDownloadProgress",
				);
				expect(retryEvents.some((event) => event.status === "reconciling")).toBe(true);
				expect(retryEvents.some((event) => event.status === "completed")).toBe(true);
				expect(retryEvents.some((event) => event.status === "downloading")).toBe(false);
				expect(retryEvents.some((event) => event.status === "replacing")).toBe(false);
			} finally {
				await runMainCommand(
					electronApp,
					"dropAutomaticDownloadReconcileFailureTrigger",
				).catch(() => undefined);
				if (recorderStarted) {
					await stopRendererEventRecorder(
						basePage,
						"animeDbDownloadProgress",
					).catch(() => undefined);
				}
				await callRendererApi(
					basePage,
					"groupAssignments",
					"resetToAnimeGrouping",
				).catch(() => undefined);
			}
		},
	);

	test(
		"GitHub-release AnimeDB download failure keeps the installed DB usable",
		async () => {
			const basePage       = context.getBasePage();
			const electronApp    = context.getElectronApp();
			const { ids }        = context.getSnapshot();
			const releaseVersion = "e2e-github-anime-db-failure";
			const errorMessage   = "E2E mocked AnimeDB release stream failure";

			const installedBefore = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getReleaseStatus",
			);

			await runMainCommand(
				electronApp,
				"installMockAnimeDbReleaseDownloadFailure",
				[
					releaseVersion,
					errorMessage,
				],
			);
			await startRendererEventRecorder(
				basePage,
				"animeDbDownloadProgress",
			);

			const releaseBefore = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getReleaseStatus",
			);
			expect(releaseBefore.latestVersion).toBe(releaseVersion);
			expect(releaseBefore.updateAvailable).toBe(true);

			const startResult = await callRendererApi(
				basePage,
				"animeDbDownload",
				"start",
			);
			if (startResult.success) {
				throw new Error("Expected mocked AnimeDB release download to fail.");
			}
			expect(startResult.error).toContain(errorMessage);

			await expect.poll(async () => {
				const status = await callRendererApi(
					basePage,
					"animeDbDownload",
					"getStatus",
				);
				return status.status;
			}).toBe("error");

			const finalStatus = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getStatus",
			);
			expect(finalStatus.version).toBe(releaseVersion);
			expect(finalStatus.errorMessage).toContain(errorMessage);

			const progressEvents = await readRendererEvents(
				basePage,
				"animeDbDownloadProgress",
			);
			expect(progressEvents.some((event) => event.status === "downloading")).toBe(true);
			expect(progressEvents.some((event) => event.status === "error" && event.errorMessage?.includes(errorMessage))).toBe(true);

			const releaseAfter = await callRendererApi(
				basePage,
				"animeDbDownload",
				"getReleaseStatus",
			);
			expect(releaseAfter.installedVersion).toBe(installedBefore.installedVersion);
			expect(releaseAfter.latestVersion).toBe(releaseVersion);
			expect(releaseAfter.updateAvailable).toBe(true);

			const postFailureInspection = await callRendererApi(
				basePage,
				"groupExplorer",
				"getMediaInspection",
				ids.relatedMedia,
			);
			expect(postFailureInspection?.mediaId).toBe(ids.relatedMedia);

			await stopRendererEventRecorder(
				basePage,
				"animeDbDownloadProgress",
			);
		},
	);
}
