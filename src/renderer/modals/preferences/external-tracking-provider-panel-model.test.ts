// @vitest-environment node

import type { ExternalTrackingAccount } from "@nimlat/types/external-tracking";
import {
	describe,
	expect,
	it,
} from "vitest";
import { createExternalTrackingProviderPanelViewModel } from "./external-tracking-provider-panel-model";

function createAccount(overrides: Partial<ExternalTrackingAccount>): ExternalTrackingAccount {
	return {
		provider:     "mal",
		status:       "available",
		capabilities: {
			authKind:                "pkce",
			canImport:               true,
			canExport: true,
			supportsEpisodeProgress: true,
		},
		...overrides,
	};
}

describe(
	"createExternalTrackingProviderPanelViewModel",
	() => {
		it(
			"marks actions enabled only for connected supported accounts",
			() => {
				expect(createExternalTrackingProviderPanelViewModel(createAccount({ status: "connected" }))).toMatchObject({
					actionDisabled: false,
					connected:      true,
					disabled:       false,
				});
				expect(createExternalTrackingProviderPanelViewModel(createAccount({ status: "needs_reconnect" }))).toMatchObject({
					actionDisabled: true,
					connected:      false,
					disabled:       false,
				});
				expect(createExternalTrackingProviderPanelViewModel(createAccount({ status: "unsupported" }))).toMatchObject({
					actionDisabled: true,
					connected:      false,
					disabled:       true,
				});
			},
		);

		it(
			"selects provider display labels and credential modes",
			() => {
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider: "anilist",
					status:   "connected",
				}))).toMatchObject({
					credentialMode: "anilist-token",
					providerName:   "AniList",
				});
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider: "simkl",
					status:   "available",
				}))).toMatchObject({
					credentialMode: "pkce",
					providerName:   "Simkl",
				});
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider: "kitsu",
					status:   "available",
				}))).toMatchObject({
					credentialMode: "kitsu-password",
					providerName:   "Kitsu",
				});
			},
		);

		it(
			"marks Kitsu integrated after one successful persisted public import without enabling token actions",
			() => {
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider:                "kitsu",
					status:                  "available",
					publicProfileIdentifier: "1732935",
					lastImportedAt:          1_750_000_000_000,
				}))).toMatchObject({
					actionDisabled: true,
					connected:      false,
					integrated:     true,
				});
			},
		);

		it(
			"does not mark Kitsu integrated before the saved public identifier completes an import",
			() => {
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider:                "kitsu",
					status:                  "available",
					publicProfileIdentifier: "1732935",
					lastImportedAt:          null,
				}))).toMatchObject({
					connected:  false,
					integrated: false,
				});
				expect(createExternalTrackingProviderPanelViewModel(createAccount({
					provider:       "kitsu",
					status:         "available",
					lastImportedAt: 1_750_000_000_000,
				}))).toMatchObject({
					connected:  false,
					integrated: false,
				});
			},
		);
	},
);
