// @vitest-environment jsdom

import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
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
import { GroupExplorerFacade } from "../../../../facades";
import type { MediaDownloadInspection } from "../../../../types/media-download";
import { useMediaDownloadStatusAction } from "./useMediaDownloadStatusAction";

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

function createMedia(): MediaInspectionData {
	return {
		mediaId:                           42,
		name:                              "Planetes",
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		integrationStatus:                 null,
		episodes:                          [],
	};
}

function createMediaStateHarness(initialMedia: MediaDownloadInspection = createMedia()) {
	let currentMedia                                                  = initialMedia;
	const setMedia: Dispatch<SetStateAction<MediaDownloadInspection>> = vi.fn((nextMedia) => {
		currentMedia = typeof nextMedia === "function"
			? nextMedia(currentMedia)
			: nextMedia;
	});

	return {
		get currentMedia() {
			return currentMedia;
		},
		setMedia,
	};
}

describe(
	"useMediaDownloadStatusAction",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"marks media as downloading and mirrors the status locally",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				const harness        = createMediaStateHarness();
				const setActionError = vi.fn<(nextError: SetStateAction<string | null>) => void>();
				const { result }     = renderHook(() => useMediaDownloadStatusAction(
					42,
					harness.setMedia,
					setActionError,
				));

				await result.current.setMediaDownloading();

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           42,
					integrationStatus: "downloading",
				});
				expect(setActionError).toHaveBeenCalledWith(null);
				expect(harness.currentMedia?.integrationStatus).toBe("downloading");
				expect(result.current.isSettingDownloading).toBe(false);
			},
		);

		it(
			"publishes an action error when the status write fails",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockRejectedValue(new Error("write failed"));
				const harness        = createMediaStateHarness();
				const setActionError = vi.fn<(nextError: SetStateAction<string | null>) => void>();
				const { result }     = renderHook(() => useMediaDownloadStatusAction(
					42,
					harness.setMedia,
					setActionError,
				));

				await result.current.setMediaDownloading();

				expect(setActionError).toHaveBeenLastCalledWith("write failed");
				expect(harness.currentMedia?.integrationStatus).toBeNull();
				expect(result.current.isSettingDownloading).toBe(false);
			},
		);
	},
);
