// @vitest-environment jsdom

import type {
	ExternalTrackingAccount,
	ExternalTrackingExportProgressEvent,
	ExternalTrackingProvider,
	ExternalTrackingSecretStorageStatus,
} from "@nimlat/types/external-tracking";
import { createElement } from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	createDefaultExternalTrackingDrafts,
	type ExternalTrackingActionFeedbackType,
} from "../external-tracking-preferences-model";
import { useExternalTrackingPreferencesController } from "../hooks/useExternalTrackingPreferencesController";
import ExternalTrackingPreferencesSection from "./ExternalTrackingPreferencesSection";

vi.mock("../hooks/useExternalTrackingPreferencesController");
// The toggle comes from the shared component barrel, which also exports Pixi
// components that require a real canvas. It is unrelated to collapse behavior.
vi.mock(
	"./external-tracking/ExternalTrackingProviderToggle",
	() => ({
		default: ({
								checked,
								providerName,
							}: { checked: boolean; providerName: string }) => createElement(
			"button",
			{
				role:           "switch",
				"aria-checked": checked,
				"aria-label":   `${ providerName } integration status`,
			},
		),
	}),
);

const account: ExternalTrackingAccount = {
	provider:     "mal",
	status:       "available",
	capabilities: {
		authKind:                "pkce",
		canImport:               true,
		canExport: true,
		supportsEpisodeProgress: true,
	},
};

let openProviders: ExternalTrackingProvider[] = [];
let accounts: ExternalTrackingAccount[] = [ account ];
let feedbackMessage: string | null = null;
let feedbackProvider: ExternalTrackingProvider | null = null;
let feedbackType: ExternalTrackingActionFeedbackType | null = null;
let exportProgress: ExternalTrackingExportProgressEvent | null = null;
let renderedRoot: Root | null = null;
let secretStorage: ExternalTrackingSecretStorageStatus | null = null;
let retrySecretStorage = vi.fn();

describe(
	"ExternalTrackingPreferencesSection",
	() => {
		beforeEach(() => {
			openProviders = [];
			accounts           = [ account ];
			feedbackMessage    = null;
			feedbackProvider   = null;
			feedbackType       = null;
			exportProgress     = null;
			secretStorage      = null;
			retrySecretStorage = vi.fn();
			vi.mocked(useExternalTrackingPreferencesController).mockImplementation(() => ({
				accounts,
				busyProvider: null,
				drafts:       createDefaultExternalTrackingDrafts(),
				exportProgress,
				message:         feedbackMessage,
				messageProvider: feedbackProvider,
				messageType:     feedbackType,
				openProviders,
				panelActions: {
					connectKitsu:        vi.fn(),
					disconnect:           vi.fn(),
					exportProvider:      vi.fn(),
					importProvider:       vi.fn(),
					importKitsuPublic:   vi.fn(),
					importKitsuXml:      vi.fn(),
					requestAniListToken: vi.fn(),
					saveAniListToken:     vi.fn(),
					startConnection:      vi.fn(),
					updateDraft:          vi.fn(),
				},
				isRetryingSecretStorage: false,
				retrySecretStorage,
				secretStorage,
				setOpenProviders:        (providers) => {
					openProviders = providers;
				},
				zappedProvider: null,
			}));
		});

		afterEach(() => {
			if (renderedRoot) {
				flushSync(() => renderedRoot?.unmount());
				renderedRoot = null;
			}
			vi.clearAllMocks();
		});

		it(
			"omits the redundant available tag and opens the provider credentials",
			() => {
				const container = document.createElement("div");
				renderedRoot    = createRoot(container);
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));
				expect(container.textContent).not.toContain("available");

				const collapsedHeader = container.querySelector<HTMLElement>(".ant-collapse-header");
				expect(collapsedHeader?.getAttribute("aria-expanded")).toBe("false");

				flushSync(() => collapsedHeader?.click());
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));

				const expandedHeader = container.querySelector<HTMLElement>(".ant-collapse-header");
				expect(expandedHeader?.getAttribute("aria-expanded")).toBe("true");
				expect(container.querySelector('input[placeholder="Client ID"]')).not.toBeNull();
			},
		);

		it(
			"omits the redundant connected tag when the integration toggle is active",
			() => {
				accounts        = [
					{
						...account,
						status: "connected",
					},
				];
				openProviders   = [ "mal" ];
				const container = document.createElement("div");
				renderedRoot    = createRoot(container);
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));

				expect(container.textContent).not.toContain("connected");
				expect(container.querySelector("[role=\"switch\"]")?.getAttribute("aria-checked")).toBe("true");
				expect(container.textContent).toContain("Import from MyAnimeList");
				expect(container.textContent).toContain("Export to MyAnimeList");
				expect(container.textContent).not.toContain("Sync");
				const buttons          = Array.from(container.querySelectorAll("button"));
				const connectButton    = buttons.find(button => button.textContent?.includes("Connect MyAnimeList"));
				const disconnectButton = buttons.find(button => button.textContent?.includes("Disconnect"));
				expect(connectButton?.disabled).toBe(true);
				expect(disconnectButton?.disabled).toBe(false);
			},
		);

		it(
			"shows live Kitsu export progress with rate-limit help",
			() => {
				accounts        = [
					{
						provider:     "kitsu",
						status:       "connected",
						capabilities: {
							authKind:                "password",
							canImport:               true,
							canExport:               true,
							supportsEpisodeProgress: true,
						},
					},
				];
				exportProgress  = {
					provider:       "kitsu",
					completedItems: 5,
					totalItems:     54,
					active:         true,
				};
				openProviders   = [ "kitsu" ];
				const container = document.createElement("div");
				renderedRoot    = createRoot(container);
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));

				expect(container.querySelector("[role=\"status\"]")?.textContent).toContain("Exporting to Kitsu: 5/54");
				expect(container.querySelector("[aria-label=\"Why Kitsu exports can take longer\"]")).not.toBeNull();
			},
		);

		it(
			"renders the storage permission state and delegates its explicit action",
			() => {
				secretStorage   = {
					security:            "access_required",
					encryptionAvailable: true,
					backendLabel:        "macOS Keychain",
					checkedAt:           1,
					retryAvailable:      true,
					storagePath:         "/tmp/user_data.db",
					message:             "Allow macOS Keychain access to protect tracking credentials.",
					warning:             null,
				};
				const container = document.createElement("div");
				renderedRoot    = createRoot(container);
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));

				expect(container.querySelector(".ant-alert-info")).not.toBeNull();
				const allowAccessButton = Array.from(container.querySelectorAll("button"))
					.find(button => button.textContent?.includes("Allow macOS Keychain access"));
				flushSync(() => allowAccessButton?.click());
				expect(retrySecretStorage).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"shows Kitsu public import as integrated without token-only account actions",
			() => {
				accounts         = [
					{
						provider:                "kitsu",
						status:                  "available",
						publicProfileIdentifier: "1732935",
						lastImportedAt:          Date.now(),
						capabilities:            {
							authKind:                "password",
							canImport:               true,
							canExport:               false,
							supportsEpisodeProgress: true,
						},
					},
				];
				feedbackMessage  = "Import complete: matched 6 of 6 anime in your Nimlat library.";
				feedbackProvider = "kitsu";
				feedbackType     = "success";
				openProviders    = [ "kitsu" ];
				const container  = document.createElement("div");
				renderedRoot     = createRoot(container);
				flushSync(() => renderedRoot?.render(createElement(ExternalTrackingPreferencesSection)));

				expect(container.querySelector("[role=\"status\"]")?.textContent).toBe(feedbackMessage);
				expect(container.querySelector(".ant-alert-success")).not.toBeNull();
				expect(container.querySelector("[role=\"switch\"][aria-label=\"Kitsu integration status\"]")
					?.getAttribute("aria-checked")).toBe("true");
				expect(container.textContent).toContain("Last import:");
				expect(container.textContent).not.toContain("Last sync:");
				const buttonLabels = Array.from(container.querySelectorAll("button")).map(button => button.textContent?.trim());
				expect(buttonLabels).not.toContain("Import");
				expect(buttonLabels).not.toContain("Export");
				expect(buttonLabels).not.toContain("Disconnect");
			},
		);
	},
);
