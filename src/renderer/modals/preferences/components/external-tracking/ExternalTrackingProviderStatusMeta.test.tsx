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
} from "vitest";
import { formatExternalTrackingTimestamp } from "../../external-tracking-preferences-model";
import ExternalTrackingProviderStatusMeta from "./ExternalTrackingProviderStatusMeta";

let renderedRoot: Root | null = null;

function createAccount(
	provider: ExternalTrackingAccount["provider"],
	tokenExpiresAt: number | null,
): ExternalTrackingAccount {
	return {
		provider,
		status:       "connected",
		tokenExpiresAt,
		capabilities: {
			authKind:                provider === "kitsu" ? "password" : "implicit",
			canImport:               true,
			canExport:               true,
			supportsEpisodeProgress: true,
		},
	};
}

function renderStatus(account: ExternalTrackingAccount): HTMLDivElement {
	const container = document.createElement("div");
	renderedRoot    = createRoot(container);
	flushSync(() => renderedRoot?.render(createElement(
		ExternalTrackingProviderStatusMeta,
		{ account },
	)));
	return container;
}

describe(
	"ExternalTrackingProviderStatusMeta",
	() => {
		afterEach(() => {
			if (renderedRoot) flushSync(() => renderedRoot?.unmount());
			renderedRoot = null;
		});

		it(
			"shows a known AniList expiry without comparing authentication flows",
			() => {
				const expiresAt = Date.UTC(
					2030,
					0,
					1,
				);
				const container = renderStatus(createAccount(
					"anilist",
					expiresAt,
				));

				expect(container.textContent).toContain(`Access token expiry: ${ formatExternalTrackingTimestamp(expiresAt) }`);
				expect(container.textContent).not.toContain("PKCE");
				expect(container.textContent).not.toContain("refresh is automatic");
			},
		);

		it(
			"omits an unknown AniList expiry and keeps Kitsu refresh context",
			() => {
				expect(renderStatus(createAccount(
					"anilist",
					null,
				)).textContent).not.toContain("Access token expiry");

				if (renderedRoot) flushSync(() => renderedRoot?.unmount());
				renderedRoot = null;
				expect(renderStatus(createAccount(
					"kitsu",
					1_900_000_000_000,
				)).textContent).toContain("refresh is automatic");
			},
		);
	},
);
