// @vitest-environment jsdom
import type { ExternalTrackingSecretStorageStatus } from "@nimlat/types/external-tracking";
import {
	createElement,
	type ReactElement,
} from "react";
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
import ExternalTrackingSecretStorageAlert from "./ExternalTrackingSecretStorageAlert";

let renderedRoots: Root[] = [];

function renderComponent(element: ReactElement): {
	container: HTMLDivElement;
	render: (nextElement: ReactElement) => void;
} {
	const container = document.createElement("div");
	const root      = createRoot(container);
	const render    = (nextElement: ReactElement) => {
		flushSync(() => root.render(nextElement));
	};

	render(element);
	renderedRoots.push(root);

	return {
		container,
		render,
	};
}

function createStatus(
	security: ExternalTrackingSecretStorageStatus["security"],
	retryAvailable = security !== "os_encrypted",
	backendLabel   = "macOS Keychain",
): ExternalTrackingSecretStorageStatus {
	const message = security === "os_encrypted"
		? `Credentials are stored safely in ${ backendLabel }.`
		: security === "access_required"
			? `Allow ${ backendLabel } access to protect tracking credentials.`
			: "Tracking credentials are stored in plaintext.";
	return {
		security,
		encryptionAvailable: true,
		backendLabel,
		checkedAt:           1,
		plaintextSecretsStored: security === "plaintext",
		retryAvailable,
		storagePath:         security === "os_encrypted" ? null : "/tmp/user_data.db",
		message,
		warning:                security === "plaintext" ? "Existing credentials remain in user_data.db." : null,
	};
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes(label));
}

describe(
	"ExternalTrackingSecretStorageAlert",
	() => {
		afterEach(() => {
			for (const root of renderedRoots) {
				flushSync(() => root.unmount());
			}
			renderedRoots = [];
		});

		it(
			"shows a permission alert and starts access only from its explicit action",
			() => {
				const onRetry       = vi.fn();
				const { container } = renderComponent(createElement(
					ExternalTrackingSecretStorageAlert,
					{
						status:     createStatus("access_required"),
						isRetrying: false,
						onRetry,
					},
				));

				expect(container.querySelector(".ant-alert-info")).not.toBeNull();
				expect(container.textContent).toContain("Allow macOS Keychain access to protect tracking credentials.");
				expect(container.textContent).toMatch(/used only to encrypt the passwords and access tokens/u);
				const button = findButton(
					container,
					"Allow macOS Keychain access",
				);
				expect(button?.textContent).toBe("Allow macOS Keychain access");
				button?.click();
				expect(onRetry).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"shows plaintext storage as a warning and allows a supported retry",
			() => {
				const onRetry       = vi.fn();
				const { container } = renderComponent(createElement(
					ExternalTrackingSecretStorageAlert,
					{
						status:     createStatus("plaintext"),
						isRetrying: false,
						onRetry,
					},
				));

				expect(container.querySelector(".ant-alert-warning")).not.toBeNull();
				expect(container.textContent).toContain("Tracking credentials are stored in plaintext.");
				expect(container.textContent).toContain("Existing credentials remain in user_data.db.");
				const retryButton = findButton(
					container,
					"Protect stored credentials",
				);
				expect(retryButton?.textContent).toBe("Protect stored credentials");
				expect(retryButton?.disabled).toBe(false);
				retryButton?.click();
				expect(onRetry).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"shows protected OS storage as success without a permission action",
			() => {
				const { container } = renderComponent(createElement(
					ExternalTrackingSecretStorageAlert,
					{
						status: createStatus(
							"os_encrypted",
							false,
							"Windows Data Protection API",
						),
						isRetrying: false,
						onRetry:    vi.fn(),
					},
				));

				expect(container.querySelector(".ant-alert-success")).not.toBeNull();
				expect(container.textContent).toContain("Credentials are stored safely in Windows Data Protection API.");
				expect(container.querySelector(".ant-alert-description")).toBeNull();
				expect(container.querySelector("button.ant-btn-primary")).toBeNull();
			},
		);

		it(
			"does not offer a meaningless retry when plaintext fallback cannot recover",
			() => {
				const { container } = renderComponent(createElement(
					ExternalTrackingSecretStorageAlert,
					{
						status: createStatus(
							"plaintext",
							false,
						),
						isRetrying: false,
						onRetry:    vi.fn(),
					},
				));

				expect(container.querySelector(".ant-alert-warning")).not.toBeNull();
				expect(container.querySelector("button.ant-btn-primary")).toBeNull();
			},
		);
	},
);
