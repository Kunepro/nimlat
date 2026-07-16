// @vitest-environment jsdom
import type {
	ExternalTrackingAccount,
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
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createDefaultExternalTrackingDrafts } from "../../../external-tracking-preferences-model";
import ExternalTrackingKitsuPasswordForm from "./ExternalTrackingKitsuPasswordForm";

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

function createStorageStatus(
	security: ExternalTrackingSecretStorageStatus["security"],
	retryAvailable = false,
): ExternalTrackingSecretStorageStatus {
	return {
		security,
		encryptionAvailable: security === "os_encrypted",
		backendLabel:        "Windows DPAPI",
		checkedAt:           1,
		retryAvailable,
		message:             "Storage status",
	};
}

function renderForm(
	secretStorage: ExternalTrackingSecretStorageStatus | null,
	onRetrySecretStorage                     = vi.fn(),
	accountOverride: ExternalTrackingAccount = account,
): HTMLDivElement {
	const container = document.createElement("div");
	renderedRoot    = createRoot(container);
	const draft     = createDefaultExternalTrackingDrafts().kitsu;
	draft.email     = "user@example.com";
	draft.password  = "temporary-password";
	flushSync(() => renderedRoot?.render(createElement(
		ExternalTrackingKitsuPasswordForm,
		{
			account:                 accountOverride,
			draft,
			disabled:                false,
			isBusy:                  false,
			isRetryingSecretStorage: false,
			onConnect:               vi.fn(),
			onRetrySecretStorage,
			onUpdateDraft:           vi.fn(),
			secretStorage,
		},
	)));
	return container;
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes(label));
}

describe(
	"ExternalTrackingKitsuPasswordForm",
	() => {
		afterEach(() => {
			if (renderedRoot) flushSync(() => renderedRoot?.unmount());
			renderedRoot = null;
			vi.clearAllMocks();
		});

		it(
			"blocks only account connection and keeps its explanation behind an info control",
			() => {
				const container = renderForm(createStorageStatus("plaintext"));

				expect(container.querySelector(".ant-alert")).toBeNull();
				expect(container.querySelector("[aria-label=\"About connecting Kitsu\"]")).not.toBeNull();
				expect(Array.from(container.querySelectorAll("input")).every(input => input.disabled)).toBe(true);
				expect(findButton(
					container,
					"Connect to Kitsu",
				)?.disabled).toBe(true);
			},
		);

		it(
			"offers secure-storage recovery beside the blocked connection form",
			() => {
				const onRetry   = vi.fn();
				const container = renderForm(
					createStorageStatus(
						"access_required",
						true,
					),
					onRetry,
				);

				const retryButton = findButton(
					container,
					"Allow access",
				);
				retryButton?.click();
				expect(onRetry).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"enables Kitsu connection without adding a status banner when storage is safe",
			() => {
				const container = renderForm(createStorageStatus("os_encrypted"));

				expect(container.querySelector(".ant-alert")).toBeNull();
				expect(container.querySelector("[aria-label=\"About connecting Kitsu\"]")).not.toBeNull();
				expect(Array.from(container.querySelectorAll("input")).every(input => !input.disabled)).toBe(true);
				expect(findButton(
					container,
					"Connect to Kitsu",
				)?.disabled).toBe(false);
			},
		);

		it(
			"keeps the password login separate from the public profile identifier",
			() => {
				const container  = renderForm(createStorageStatus("os_encrypted"));
				const emailInput = container.querySelector("input[placeholder=\"Kitsu account email\"]");

				expect(emailInput).not.toBeNull();
				expect(emailInput).toHaveProperty(
					"value",
					"user@example.com",
				);
			},
		);

		it(
			"shows a stable connected state without editable credentials or an account label",
			() => {
				const container = renderForm(
					createStorageStatus("os_encrypted"),
					vi.fn(),
					{
						...account,
						status: "connected",
					},
				);

				expect(container.querySelectorAll("input")).toHaveLength(0);
				expect(findButton(
					container,
					"Connect to Kitsu",
				)?.disabled).toBe(true);
				expect(container.textContent).not.toContain("Reconnect Kitsu");
				expect(container.querySelector("input[placeholder*=\"Account label\"]")).toBeNull();
			},
		);
	},
);
