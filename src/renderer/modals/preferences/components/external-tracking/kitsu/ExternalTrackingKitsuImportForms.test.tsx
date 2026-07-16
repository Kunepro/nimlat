// @vitest-environment jsdom
import type { ExternalTrackingAccount } from "@nimlat/types/external-tracking";
import { createElement } from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createDefaultExternalTrackingDrafts } from "../../../external-tracking-preferences-model";
import ExternalTrackingKitsuCredentialsForm from "../../ExternalTrackingKitsuCredentialsForm";
import ExternalTrackingKitsuPublicImportForm from "./ExternalTrackingKitsuPublicImportForm";
import ExternalTrackingKitsuXmlImportForm from "./ExternalTrackingKitsuXmlImportForm";

const account: ExternalTrackingAccount = {
	provider:     "kitsu",
	status:       "available",
	capabilities: {
		authKind:                "password",
		canImport:               true,
		canExport:               true,
		supportsEpisodeProgress: true,
	},
};

let renderedRoot: Root | null = null;

function render(element: ReturnType<typeof createElement>): HTMLDivElement {
	const container = document.createElement("div");
	renderedRoot    = createRoot(container);
	flushSync(() => renderedRoot?.render(element));
	return container;
}

describe(
	"Kitsu import forms",
	() => {
		afterEach(() => {
			if (renderedRoot) flushSync(() => renderedRoot?.unmount());
			renderedRoot = null;
		});

		it(
			"uses a neutral info tooltip instead of an XML status banner",
			() => {
				const container = render(createElement(
					ExternalTrackingKitsuXmlImportForm,
					{
						disabled: false,
						isBusy:   false,
						onImport: vi.fn(),
					},
				));

				expect(container.querySelector(".ant-alert")).toBeNull();
				expect(container.querySelector("[aria-label=\"About Kitsu XML import\"]")).not.toBeNull();
			},
		);

		it(
			"uses a neutral info tooltip instead of a username status banner",
			() => {
				const container = render(createElement(
					ExternalTrackingKitsuPublicImportForm,
					{
						account,
						draft:         createDefaultExternalTrackingDrafts().kitsu,
						disabled:      false,
						isBusy:        false,
						onImport:      vi.fn(),
						onUpdateDraft: vi.fn(),
					},
				));

				expect(container.querySelector(".ant-alert")).toBeNull();
				expect(container.querySelector("[aria-label=\"About Kitsu public import\"]")).not.toBeNull();
			},
		);

		it(
			"labels import choices from the Nimlat user's point of view",
			() => {
				const container = render(createElement(
					ExternalTrackingKitsuCredentialsForm,
					{
						account,
						draft:                   createDefaultExternalTrackingDrafts().kitsu,
						disabled:                false,
						isBusy:                  false,
						isRetryingSecretStorage: false,
						onConnectKitsu:          vi.fn(),
						onImportKitsuPublic:     vi.fn(),
						onImportKitsuXml:        vi.fn(),
						onRetrySecretStorage:    vi.fn(),
						onUpdateDraft:           vi.fn(),
						secretStorage:           {
							security:            "os_encrypted",
							encryptionAvailable: true,
							backendLabel:        "Windows DPAPI",
							checkedAt:           1,
							retryAvailable:      false,
							message:             "Protected",
						},
					},
				));

				expect(container.textContent).toContain("Import XML");
				expect(container.textContent).toContain("Import by username");
				expect(container.textContent).toContain("Connect account");
				expect(container.textContent).not.toContain("XML export");
			},
		);
	},
);
