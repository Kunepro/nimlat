// @vitest-environment node

import type { ExternalTrackingAccount } from "@nimlat/types/external-tracking";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createAniListImplicitAuthorizationUrl,
	createAniListImplicitTokenRequest,
	createDefaultExternalTrackingDrafts,
	createExternalTrackingStartConnectionRequest,
	createKitsuPasswordConnectionRequest,
	createKitsuPublicProfileImportRequest,
	formatExternalTrackingActionError,
	getExternalTrackingActionResultMessage,
	getExternalTrackingProviderName,
	getExternalTrackingStatusLabel,
	isExternalTrackingAccountConnected,
	isExternalTrackingAccountUnsupported,
	mergeExternalTrackingAccountDraftValues,
	normalizeOpenExternalTrackingProviderKeys,
	orderExternalTrackingAccounts,
} from "./external-tracking-preferences-model";

const baseAccount: ExternalTrackingAccount = {
	provider:     "mal",
	status:       "available",
	capabilities: {
		canImport:               true,
		canExport: true,
		supportsEpisodeProgress: false,
		authKind:                "pkce",
	},
};

describe(
	"external-tracking-preferences-model",
	() => {
		it(
			"creates provider drafts with desktop redirect defaults for PKCE providers",
			() => {
				const drafts = createDefaultExternalTrackingDrafts();

				expect(drafts.mal.redirectUri).toBe("http://127.0.0.1:8765/callback");
				expect(drafts.simkl.redirectUri).toBe("http://127.0.0.1:8765/callback");
				expect(drafts.anilist.redirectUri).toBe("");
				expect(drafts.kitsu.redirectUri).toBe("");
			},
		);

		it(
			"normalizes Ant collapse keys to supported external tracking providers",
			() => {
				expect(normalizeOpenExternalTrackingProviderKeys([
					"mal",
					"unknown",
					"anilist",
				])).toEqual([
					"mal",
					"anilist",
				]);
			},
		);

		it(
			"maps provider ids to display names",
			() => {
				expect(getExternalTrackingProviderName("mal")).toBe("MyAnimeList");
				expect(getExternalTrackingProviderName("simkl")).toBe("Simkl");
			},
		);

		it(
			"derives provider status labels and account flags",
			() => {
				expect(getExternalTrackingStatusLabel({
					...baseAccount,
					status: "needs_reconnect",
				})).toBe("needs reconnect");
				expect(isExternalTrackingAccountConnected({
					...baseAccount,
					status: "connected",
				})).toBe(true);
				expect(isExternalTrackingAccountUnsupported({
					...baseAccount,
					status: "unsupported",
				})).toBe(true);
			},
		);

		it(
			"orders usable accounts and restores persisted provider draft values",
			() => {
				const drafts                              = createDefaultExternalTrackingDrafts();
				drafts.mal.clientId                       = "existing-mal";
				const accounts: ExternalTrackingAccount[] = [
					{
						...baseAccount,
						provider: "anilist",
						clientId: "anilist-client",
					},
					{
						...baseAccount,
						provider: "mal",
						clientId: null,
					},
					{
						...baseAccount,
						provider:                "kitsu",
						publicProfileIdentifier: "saved-kitsu-user",
					},
				];

				expect(orderExternalTrackingAccounts(accounts).map(account => account.provider)).toEqual([
					"mal",
					"anilist",
					"kitsu",
				]);
				expect(mergeExternalTrackingAccountDraftValues(
					drafts,
					accounts,
				)).toEqual({
					...drafts,
					mal:     {
						...drafts.mal,
						clientId: "existing-mal",
					},
					anilist: {
						...drafts.anilist,
						clientId: "anilist-client",
					},
					kitsu: {
						...drafts.kitsu,
						username: "saved-kitsu-user",
					},
				});

				const editedDrafts          = createDefaultExternalTrackingDrafts();
				editedDrafts.kitsu.username = "currently-editing";
				expect(mergeExternalTrackingAccountDraftValues(
					editedDrafts,
					accounts,
					false,
				).kitsu.username).toBe("currently-editing");
			},
		);

		it(
			"builds provider action requests from credential drafts",
			() => {
				const drafts               = createDefaultExternalTrackingDrafts();
				drafts.mal.clientId        = "mal-client";
				drafts.mal.redirectUri     = "http://localhost/callback";
				drafts.anilist.clientId    = "ani-client";
				drafts.anilist.token       = "https://redirect.example/#access_token=token";
				drafts.kitsu.email    = "user@example.com";
				drafts.kitsu.username = "kitsu-user";
				drafts.kitsu.password = "kitsu-password";

				expect(createExternalTrackingStartConnectionRequest(
					"mal",
					drafts,
				)).toEqual({
					provider:    "mal",
					clientId:    "mal-client",
					redirectUri: "http://localhost/callback",
				});
				expect(createAniListImplicitTokenRequest(drafts)).toEqual({
					provider:           "anilist",
					clientId:           "ani-client",
					tokenOrRedirectUrl: "https://redirect.example/#access_token=token",
				});
				expect(createKitsuPasswordConnectionRequest(drafts)).toEqual({
					provider: "kitsu",
					email:    "user@example.com",
					password: "kitsu-password",
				});
				expect(createKitsuPublicProfileImportRequest(drafts)).toEqual({
					provider: "kitsu",
					username: "kitsu-user",
				});
			},
		);

		it(
			"builds the documented AniList implicit authorization URL from the client ID",
			() => {
				expect(createAniListImplicitAuthorizationUrl(" 12345 ")).toBe(
					"https://anilist.co/api/v2/oauth/authorize?client_id=12345&response_type=token",
				);
				expect(() => createAniListImplicitAuthorizationUrl(" ")).toThrow(
					"Enter the AniList client ID before requesting a token.",
				);
			},
		);

		it(
			"formats action result messages and fallback errors",
			() => {
				expect(getExternalTrackingActionResultMessage({ message: "Imported 12 entries" })).toBe("Imported 12 entries");
				expect(getExternalTrackingActionResultMessage({ ok: true })).toBeNull();
				expect(formatExternalTrackingActionError(new Error("Provider down"))).toBe("Provider down");
				expect(formatExternalTrackingActionError(new Error(
					"Error invoking remote method 'externalTracking:kitsuPasswordConnect': ExternalTrackingAuthenticationError: Kitsu did not accept that email and password.",
				))).toBe("Kitsu did not accept that email and password.");
				expect(formatExternalTrackingActionError("failed")).toBe("External tracking action failed.");
			},
		);
	},
);
