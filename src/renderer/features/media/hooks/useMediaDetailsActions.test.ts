// @vitest-environment jsdom

import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ROUTES } from "../../../constants/route-config";
import { useMediaDetailsActions } from "./useMediaDetailsActions";

const routerMock = vi.hoisted(() => ({
	navigate: vi.fn(),
}));

const appMessageMock = vi.hoisted(() => ({
	error: vi.fn(),
}));

const editMediaModalMock = vi.hoisted(() => ({
	openEditMediaModal: vi.fn(),
}));

const mediaDetailsActionsRunner = vi.hoisted(() => ({
	persistIgnoredMediaIntegrationStatus: vi.fn<(mediaId: number) => Promise<{ success: boolean; error?: string }>>(),
	persistMediaWatchedState:             vi.fn<(mediaId: number, isWatched: boolean) => Promise<{
		success: boolean;
		error?: string
	}>>(),
	refreshMediaMetadata:                 vi.fn<(mediaId: number) => Promise<{ success: boolean; error?: string }>>(),
}));

vi.mock(
	"@tanstack/react-router",
	() => ({
		useNavigate: () => routerMock.navigate,
	}),
);

vi.mock(
	"../../../hooks",
	() => ({
		useAppMessage: () => appMessageMock,
	}),
);

vi.mock(
	"../../../modals/edit-media/edit-media-modal.state",
	() => ({
		useOpenEditMediaModal: () => editMediaModalMock.openEditMediaModal,
	}),
);

vi.mock(
	"../media-details-actions-runner",
	() => ({
		persistIgnoredMediaIntegrationStatus: mediaDetailsActionsRunner.persistIgnoredMediaIntegrationStatus,
		persistMediaWatchedState:             mediaDetailsActionsRunner.persistMediaWatchedState,
		refreshMediaMetadata:                 mediaDetailsActionsRunner.refreshMediaMetadata,
	}),
);

interface HookProps {
	media: MediaInspectionData | null;
	numericMediaId: number;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	updateMedia: (updater: (current: MediaInspectionData | null) => MediaInspectionData | null) => void;
}

interface RenderedHook<TProps, TResult> {
	result: { readonly current: TResult };
	rerender: (nextProps: TProps) => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<TProps, TResult>(
	useHook: (props: TProps) => TResult,
	initialProps: TProps,
): RenderedHook<TProps, TResult> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentProps = initialProps;
	let currentValue: TResult | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook(currentProps);
		return null;
	}

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	render();

	const rerender = (nextProps: TProps) => {
		currentProps = nextProps;
		render();
	};

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
		rerender,
		unmount,
	};
}

function createMedia(overrides: Partial<MediaInspectionData> = {}): MediaInspectionData {
	return {
		mediaId:                           42,
		name:                              "Cowboy Bebop",
		description:                       "Space jazz",
		isFilm:                            false,
		isWatched:                         false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [],
		...overrides,
	};
}

function createHookProps(overrides: Partial<HookProps> = {}): HookProps {
	return {
		media:          createMedia(),
		numericMediaId: 42,
		refreshMedia:   vi.fn<((showLoader?: boolean) => Promise<void>)>().mockResolvedValue(undefined),
		updateMedia:    vi.fn(),
		...overrides,
	};
}

describe(
	"useMediaDetailsActions",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			routerMock.navigate.mockResolvedValue(undefined);
			mediaDetailsActionsRunner.persistIgnoredMediaIntegrationStatus.mockResolvedValue({ success: true });
			mediaDetailsActionsRunner.persistMediaWatchedState.mockResolvedValue({ success: true });
			mediaDetailsActionsRunner.refreshMediaMetadata.mockResolvedValue({ success: true });
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"opens edit modal and library filters through route-safe actions",
			() => {
				const media      = createMedia({
					mediaId:     7,
					name:        "Samurai Champloo",
					description: undefined,
				});
				const props      = createHookProps({ media });
				const { result } = renderHook(
					(hookProps: HookProps) => useMediaDetailsActions(hookProps),
					props,
				);

				result.current.editMedia();
				expect(editMediaModalMock.openEditMediaModal).toHaveBeenCalledWith({
					mediaId:            7,
					initialName:        "Samurai Champloo",
					initialDescription: "",
				});

				result.current.openGenreFilter("Action");
				expect(routerMock.navigate).toHaveBeenCalledWith({
					to:      ROUTES.GROUPS.FULL_URL,
					search:  {
						genreNames: [ "Action" ],
						tagNames:   undefined,
					},
					replace: false,
				});

				result.current.openTagFilter("Found Family");
				expect(routerMock.navigate).toHaveBeenCalledWith({
					to:      ROUTES.GROUPS.FULL_URL,
					search:  {
						genreNames: undefined,
						tagNames:   [ "Found Family" ],
					},
					replace: false,
				});
			},
		);

		it(
			"persists ignore status and successful metadata refreshes",
			async () => {
				const props      = createHookProps();
				const { result } = renderHook(
					(hookProps: HookProps) => useMediaDetailsActions(hookProps),
					props,
				);

				await result.current.ignoreMedia();
				expect(mediaDetailsActionsRunner.persistIgnoredMediaIntegrationStatus).toHaveBeenCalledWith(42);

				await result.current.refreshMetadata();
				expect(mediaDetailsActionsRunner.refreshMediaMetadata).toHaveBeenCalledWith(42);
				expect(props.refreshMedia).toHaveBeenCalledWith(false);
			},
		);

		it(
			"rolls back optimistic watched-state updates when persistence fails",
			async () => {
				const media       = createMedia({ isWatched: false });
				const updateMedia = vi.fn<HookProps["updateMedia"]>();
				mediaDetailsActionsRunner.persistMediaWatchedState.mockResolvedValueOnce({
					success: false,
					error:   "watch write failed",
				});
				const { result } = renderHook(
					(hookProps: HookProps) => useMediaDetailsActions(hookProps),
					createHookProps({
						media,
						updateMedia,
					}),
				);

				await result.current.toggleWatched();

				expect(mediaDetailsActionsRunner.persistMediaWatchedState).toHaveBeenCalledWith(
					42,
					true,
				);
				expect(updateMedia).toHaveBeenCalledTimes(2);
				const optimisticSnapshot = updateMedia.mock.calls[ 0 ][ 0 ](media);
				expect(optimisticSnapshot?.isWatched).toBe(true);
				expect(updateMedia.mock.calls[ 1 ][ 0 ](optimisticSnapshot)).toEqual(media);
				expect(appMessageMock.error).toHaveBeenCalledWith("watch write failed");
			},
		);
	},
);
