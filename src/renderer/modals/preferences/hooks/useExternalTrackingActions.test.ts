// @vitest-environment jsdom

import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createDefaultExternalTrackingDrafts } from "../external-tracking-preferences-model";
import { useExternalTrackingActions } from "./useExternalTrackingActions";

const mocks = vi.hoisted(() => ({
	connectKitsuExternalTracking: vi.fn(),
	runExternalTrackingAction:    vi.fn(),
}));

vi.mock(
	"../external-tracking-preferences-runner",
	() => ({
		connectKitsuExternalTracking:              mocks.connectKitsuExternalTracking,
		disconnectExternalTrackingProvider:        vi.fn(),
		exportExternalTrackingProvider:            vi.fn(),
		importExternalTrackingProvider:            vi.fn(),
		importKitsuPublicExternalTracking:         vi.fn(),
		importKitsuXmlExternalTracking:            vi.fn(),
		requestAniListExternalTrackingAccessToken: vi.fn(),
		saveAniListExternalTrackingToken:          vi.fn(),
		startExternalTrackingConnection:           vi.fn(),
	}),
);

vi.mock(
	"./useExternalTrackingActionRunner",
	() => ({
		useExternalTrackingActionRunner: () => ({
			busyProvider:              null,
			message:                   null,
			messageProvider:           null,
			messageType:               null,
			runExternalTrackingAction: mocks.runExternalTrackingAction,
		}),
	}),
);

describe(
	"useExternalTrackingActions",
	() => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it(
			"keeps Kitsu open and preserves AniList drafts while requesting a token",
			() => {
				const triggerCredentialZap                                        = vi.fn();
				const container                                                   = document.createElement("div");
				const root                                                        = createRoot(container);
				let actions: ReturnType<typeof useExternalTrackingActions> | null = null;

				function HookHost(): ReactElement | null {
					actions = useExternalTrackingActions({
						drafts:             createDefaultExternalTrackingDrafts(),
						refreshSettings:    vi.fn(),
						triggerCredentialZap,
						clearKitsuPassword: vi.fn(),
					});
					return null;
				}

				flushSync(() => root.render(createElement(HookHost)));
				if (!actions) throw new Error("Expected external tracking actions to render.");

				flushSync(() => actions?.connectKitsu());

				expect(mocks.runExternalTrackingAction).toHaveBeenCalledWith(
					"kitsu",
					expect.any(Function),
				);
				expect(mocks.runExternalTrackingAction.mock.calls[ 0 ]).toHaveLength(2);
				expect(triggerCredentialZap).not.toHaveBeenCalled();

				flushSync(() => actions?.requestAniListToken());
				expect(mocks.runExternalTrackingAction).toHaveBeenLastCalledWith(
					"anilist",
					expect.any(Function),
					{ refreshSettings: false },
				);
				flushSync(() => root.unmount());
			},
		);
	},
);
