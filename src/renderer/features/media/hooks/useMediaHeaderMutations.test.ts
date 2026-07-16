// @vitest-environment jsdom

import type { IntegrationStatus } from "@nimlat/types/anime-db";
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
import { GroupExplorerFacade } from "../../../facades";
import type { MediaLayoutPlaybackIssueState } from "../media-layout-model";
import { useMediaHeaderMutations } from "./useMediaHeaderMutations";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
	});

	const unmount = () => {
		if (!isMounted) {
			return;
		}
		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}

				return currentValue;
			},
		},
		unmount,
	};
}

describe(
	"useMediaHeaderMutations",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"persists header tracking status and mirrors the accepted value locally",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				const setHeaderIntegrationStatus  = vi.fn<(status: IntegrationStatus | null) => void>();
				const setHeaderPlaybackIssueState = vi.fn<(state: Partial<MediaLayoutPlaybackIssueState>) => void>();
				const { result }                  = renderHook(() => useMediaHeaderMutations({
					mediaId: "42",
					setHeaderIntegrationStatus,
					setHeaderPlaybackIssueState,
				}));

				await result.current.handleHeaderTrackingStatusChange("tracked");

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           42,
					integrationStatus: "tracked",
				});
				expect(setHeaderIntegrationStatus).toHaveBeenCalledWith("tracked");
				expect(setHeaderPlaybackIssueState).not.toHaveBeenCalled();
			},
		);

		it(
			"persists playback issue edits and mirrors the saved issue state locally",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveMediaIntegrationState",
				).mockResolvedValue({ success: true });
				const setHeaderIntegrationStatus  = vi.fn<(status: IntegrationStatus | null) => void>();
				const setHeaderPlaybackIssueState = vi.fn<(state: Partial<MediaLayoutPlaybackIssueState>) => void>();
				const { result }                  = renderHook(() => useMediaHeaderMutations({
					mediaId: "7",
					setHeaderIntegrationStatus,
					setHeaderPlaybackIssueState,
				}));
				const payload                     = {
					integrationStatus:    "tracked" as const,
					playbackIssueNote:    "audio drifts after OP",
					hasAudioIssue:        true,
					hasDubIssue:          false,
					hasSubIssue:          true,
					hasEncodingIssue:     false,
					hasVideoIssue:        false,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "audio" as const,
							timeSeconds:           125,
						},
					],
				};

				await result.current.handleHeaderPlaybackIssueSave(payload);

				expect(GroupExplorerFacade.saveMediaIntegrationState).toHaveBeenCalledWith({
					...payload,
					mediaId: 7,
				});
				expect(setHeaderIntegrationStatus).toHaveBeenCalledWith("tracked");
				expect(setHeaderPlaybackIssueState).toHaveBeenCalledWith({
					playbackIssueNote:    payload.playbackIssueNote,
					hasDubIssue:          payload.hasDubIssue,
					hasSubIssue:          payload.hasSubIssue,
					hasEncodingIssue:     payload.hasEncodingIssue,
					hasAudioIssue:        payload.hasAudioIssue,
					hasVideoIssue:        payload.hasVideoIssue,
					playbackIssueMoments: payload.playbackIssueMoments,
				});
			},
		);
	},
);
