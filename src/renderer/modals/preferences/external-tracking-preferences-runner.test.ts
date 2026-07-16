// @vitest-environment jsdom

import type {
	ExternalTrackingAccount,
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	ExternalNavigationFacade,
	ExternalTrackingFacade,
} from "../../facades";
import { createDefaultExternalTrackingDrafts } from "./external-tracking-preferences-model";
import {
	connectKitsuExternalTracking,
	disconnectExternalTrackingProvider,
	exportExternalTrackingProvider,
	importExternalTrackingProvider,
	importKitsuPublicExternalTracking,
	importKitsuXmlExternalTracking,
	loadExternalTrackingSettings,
	requestAniListExternalTrackingAccessToken,
	retryExternalTrackingSecretStorage,
	saveAniListExternalTrackingToken,
	startExternalTrackingConnection,
	subscribeToExternalTrackingAccountsChanges,
} from "./external-tracking-preferences-runner";

function createAccount(): ExternalTrackingAccount {
	return {
		provider:     "mal",
		status:       "available",
		clientId:     "mal-client",
		capabilities: {
			canImport:               true,
			canExport: true,
			supportsEpisodeProgress: true,
			authKind:                "pkce",
		},
	};
}

function createSettings(): ExternalTrackingSettings {
	return {
		accounts:      [ createAccount() ],
		secretStorage: {
			security:            "os_encrypted",
			encryptionAvailable: true,
			backendLabel:        "Keychain",
			checkedAt:           1,
			retryAvailable: false,
			message:             "Secure storage is available.",
		},
	};
}

describe(
	"external-tracking-preferences-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads settings and subscribes to account changes through the external tracking facade",
			async () => {
				const settings         = createSettings();
				const accountsChanged$ = new Subject<ExternalTrackingAccountsChangedEvent>();
				const listener         = vi.fn();
				vi.spyOn(
					ExternalTrackingFacade,
					"getSettings",
				).mockResolvedValue(settings);
				vi.spyOn(
					ExternalTrackingFacade,
					"accountsChanges",
				).mockReturnValue(accountsChanged$);

				await expect(loadExternalTrackingSettings()).resolves.toBe(settings);

				const subscription = subscribeToExternalTrackingAccountsChanges(listener);
				accountsChanged$.next({ provider: "mal" });

				expect(listener).toHaveBeenCalledTimes(1);
				expect(ExternalTrackingFacade.getSettings).toHaveBeenCalledTimes(1);
				expect(ExternalTrackingFacade.accountsChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"retries secure storage through the external tracking facade",
			async () => {
				const status = createSettings().secretStorage;
				vi.spyOn(
					ExternalTrackingFacade,
					"retrySecretStorage",
				).mockResolvedValue(status);

				await expect(retryExternalTrackingSecretStorage()).resolves.toBe(status);
				expect(ExternalTrackingFacade.retrySecretStorage).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"persists connection commands with requests built from provider drafts",
			async () => {
				const drafts   = createDefaultExternalTrackingDrafts();
				drafts.mal     = {
					...drafts.mal,
					clientId: "mal-client",
				};
				drafts.anilist = {
					...drafts.anilist,
					clientId:    "ani-client",
					token:       "ani-token",
				};
				drafts.kitsu   = {
					...drafts.kitsu,
					email:    "user@example.com",
					password: "kitsu-password",
				};
				const account  = createAccount();
				vi.spyOn(
					ExternalTrackingFacade,
					"startConnection",
				).mockResolvedValue({
					provider: "mal",
					authUrl:  "https://mal.example/auth",
					state:    "state-1",
				});
				vi.spyOn(
					ExternalTrackingFacade,
					"saveImplicitToken",
				).mockResolvedValue({
					...account,
					provider: "anilist",
				});
				vi.spyOn(
					ExternalTrackingFacade,
					"connectKitsu",
				).mockResolvedValue({
					...account,
					provider: "kitsu",
				});

				await expect(startExternalTrackingConnection(
					"mal",
					drafts,
				)).resolves.toEqual({
					provider: "mal",
					authUrl:  "https://mal.example/auth",
					state:    "state-1",
				});
				await expect(saveAniListExternalTrackingToken(drafts)).resolves.toMatchObject({ provider: "anilist" });
				await expect(connectKitsuExternalTracking(drafts)).resolves.toMatchObject({ provider: "kitsu" });

				expect(ExternalTrackingFacade.startConnection).toHaveBeenCalledWith({
					provider:    "mal",
					clientId:    "mal-client",
					redirectUri: "http://127.0.0.1:8765/callback",
				});
				expect(ExternalTrackingFacade.saveImplicitToken).toHaveBeenCalledWith({
					provider:           "anilist",
					clientId:           "ani-client",
					tokenOrRedirectUrl: "ani-token",
				});
				expect(ExternalTrackingFacade.connectKitsu).toHaveBeenCalledWith({
					provider: "kitsu",
					email:    "user@example.com",
					password: "kitsu-password",
				});
			},
		);

		it(
			"opens the AniList implicit authorization URL through the external-navigation boundary",
			async () => {
				const drafts            = createDefaultExternalTrackingDrafts();
				drafts.anilist.clientId = " 12345 ";
				vi.spyOn(
					ExternalNavigationFacade,
					"openExternalUrl",
				).mockResolvedValue({ success: true });

				await expect(requestAniListExternalTrackingAccessToken(drafts)).resolves.toBeUndefined();
				expect(ExternalNavigationFacade.openExternalUrl).toHaveBeenCalledWith(
					"https://anilist.co/api/v2/oauth/authorize?client_id=12345&response_type=token",
				);

				vi.mocked(ExternalNavigationFacade.openExternalUrl).mockResolvedValue({
					success: false,
					error:   "Browser unavailable",
				});
				await expect(requestAniListExternalTrackingAccessToken(drafts)).rejects.toThrow("Browser unavailable");
			},
		);

		it(
			"runs both read-only Kitsu import paths through the facade",
			async () => {
				const drafts          = createDefaultExternalTrackingDrafts();
				drafts.kitsu.username = "public-user";
				const result          = {
					success:           true,
					importedItems:     2,
					matchedItems:      2,
					localUpdatedItems: 1,
				};
				vi.spyOn(
					ExternalTrackingFacade,
					"importKitsuPublic",
				).mockResolvedValue(result);
				vi.spyOn(
					ExternalTrackingFacade,
					"importKitsuXml",
				).mockResolvedValue(result);

				await expect(importKitsuPublicExternalTracking(drafts)).resolves.toBe(result);
				await expect(importKitsuXmlExternalTracking()).resolves.toBe(result);
				expect(ExternalTrackingFacade.importKitsuPublic).toHaveBeenCalledWith({
					provider: "kitsu",
					username: "public-user",
				});
				expect(ExternalTrackingFacade.importKitsuXml).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"runs provider maintenance commands through the external tracking facade",
			async () => {
				vi.spyOn(
					ExternalTrackingFacade,
					"importProvider",
				).mockResolvedValue({
					success:           true,
					importedItems:     2,
					matchedItems:      1,
					localUpdatedItems: 1,
				});
				vi.spyOn(
					ExternalTrackingFacade,
					"exportProvider",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					ExternalTrackingFacade,
					"disconnect",
				).mockResolvedValue({
					success: false,
					message: "disconnect failed",
				});

				await expect(importExternalTrackingProvider("mal")).resolves.toMatchObject({ importedItems: 2 });
				await expect(exportExternalTrackingProvider("mal")).resolves.toEqual({ success: true });
				await expect(disconnectExternalTrackingProvider("mal")).resolves.toEqual({
					success: false,
					message: "disconnect failed",
				});

				expect(ExternalTrackingFacade.importProvider).toHaveBeenCalledWith("mal");
				expect(ExternalTrackingFacade.exportProvider).toHaveBeenCalledWith("mal");
				expect(ExternalTrackingFacade.disconnect).toHaveBeenCalledWith("mal");
			},
		);
	},
);
