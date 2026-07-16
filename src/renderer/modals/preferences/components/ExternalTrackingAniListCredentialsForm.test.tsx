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
import { createDefaultExternalTrackingDrafts } from "../external-tracking-preferences-model";
import ExternalTrackingAniListCredentialsForm from "./ExternalTrackingAniListCredentialsForm";

const account: ExternalTrackingAccount = {
	provider:     "anilist",
	status:       "available",
	capabilities: {
		authKind:                "implicit",
		canImport:               true,
		canExport:               true,
		supportsEpisodeProgress: true,
	},
};

let renderedRoot: Root | null = null;

describe(
	"ExternalTrackingAniListCredentialsForm",
	() => {
		afterEach(() => {
			if (renderedRoot) {
				flushSync(() => renderedRoot?.unmount());
				renderedRoot = null;
			}
		});

		it(
			"enables the access-token request only after the user provides a client ID",
			() => {
				const container             = document.createElement("div");
				const draft                 = createDefaultExternalTrackingDrafts().anilist;
				const onRequestAniListToken = vi.fn();
				renderedRoot                = createRoot(container);

				const render = () => flushSync(() => renderedRoot?.render(createElement(
					ExternalTrackingAniListCredentialsForm,
					{
						account,
						disabled:           false,
						draft,
						isBusy:             false,
						onRequestAniListToken,
						onSaveAniListToken: vi.fn(),
						onUpdateDraft:      vi.fn(),
					},
				)));

				render();
				const requestButton = Array.from(container.querySelectorAll("button"))
					.find(button => button.textContent?.includes("Request access token from AniList"));
				expect(requestButton?.disabled).toBe(true);

				draft.clientId = "12345";
				render();
				expect(requestButton?.disabled).toBe(false);
				flushSync(() => requestButton?.click());
				expect(onRequestAniListToken).toHaveBeenCalledTimes(1);
				expect(container.querySelector("input[placeholder=\"Access token or redirect URL\"]")).not.toBeNull();
				expect(container.textContent).toContain("Save token");
			},
		);
	},
);
