// @vitest-environment jsdom

import type {
	PastReleaseWatchRow,
	UpcomingReleaseWatchRow,
} from "@nimlat/types/release-watch";
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
import { useReleaseWatchController } from "./useReleaseWatchController";
import type { ReleaseWatchFeeds } from "./useReleaseWatchFeeds";
import type { ReleaseWatchNotifications } from "./useReleaseWatchNotifications";

const releaseWatchHookMocks = vi.hoisted(() => ({
	useReleaseWatchFeeds:         vi.fn(),
	useReleaseWatchNotifications: vi.fn(),
}));

vi.mock(
	"./useReleaseWatchFeeds",
	() => ({
		useReleaseWatchFeeds: releaseWatchHookMocks.useReleaseWatchFeeds,
	}),
);

vi.mock(
	"./useReleaseWatchNotifications",
	() => ({
		useReleaseWatchNotifications: releaseWatchHookMocks.useReleaseWatchNotifications,
	}),
);

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

function createPastRow(mediaId: number): PastReleaseWatchRow {
	return {
		mediaId,
		name:                 `Past ${ mediaId }`,
		resolvedReleaseAt:    null,
		releaseDatePrecision: "unknown",
		releaseDateSource:    "none",
		updatedAt:            1,
		watchDomain:          "past",
		state:                "released_catalog",
	};
}

function createUpcomingRow(mediaId: number): UpcomingReleaseWatchRow {
	return {
		mediaId,
		name:                 `Upcoming ${ mediaId }`,
		resolvedReleaseAt:    null,
		releaseDatePrecision: "unknown",
		releaseDateSource:    "none",
		updatedAt:            1,
		watchDomain:          "upcoming",
		state:                "upcoming_media_release",
	};
}

function createNotifications(): ReleaseWatchNotifications {
	return {
		notifyReleaseWatchError:    vi.fn(),
		notifyPastLoadError:        vi.fn(),
		notifyPastRefreshError:     vi.fn(),
		notifyUpcomingLoadError:    vi.fn(),
		notifyUpcomingRefreshError: vi.fn(),
	};
}

function createFeeds(): ReleaseWatchFeeds {
	return {
		past:     {
			isLoading:  false,
			loadRows:   vi.fn<((offset?: number) => Promise<void>)>().mockResolvedValue(undefined),
			nextOffset: 10,
			rows:       [ createPastRow(1) ],
		},
		upcoming: {
			isLoading:  false,
			loadRows:   vi.fn<((offset?: number) => Promise<void>)>().mockResolvedValue(undefined),
			nextOffset: 20,
			rows:       [ createUpcomingRow(2) ],
		},
	};
}

describe(
	"useReleaseWatchController",
	() => {
		let feeds: ReleaseWatchFeeds;
		let notifications: ReleaseWatchNotifications;

		beforeEach(
			() => {
				vi.clearAllMocks();
				feeds         = createFeeds();
				notifications = createNotifications();
				releaseWatchHookMocks.useReleaseWatchFeeds.mockReturnValue(feeds);
				releaseWatchHookMocks.useReleaseWatchNotifications.mockReturnValue(notifications);
			},
		);

		afterEach(
			() => {
				cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
				cleanupRenderedHooks = [];
				vi.restoreAllMocks();
			},
		);

		it(
			"targets the active tab feed for rows, refresh, and pagination",
			() => {
				const { result } = renderHook(() => useReleaseWatchController());

				expect(result.current.activeTab).toBe("upcoming");
				expect(result.current.activeRows).toEqual(feeds.upcoming.rows);
				expect(result.current.activeNextOffset).toBe(20);

				flushSync(() => {
					result.current.loadMoreActiveRows();
				});
				expect(feeds.upcoming.loadRows).toHaveBeenCalledWith(20);

				flushSync(() => {
					result.current.selectTab("other");
				});
				expect(result.current.activeTab).toBe("upcoming");

				flushSync(() => {
					result.current.selectTab("past");
				});
				expect(result.current.activeTab).toBe("past");
				expect(result.current.activeRows).toEqual(feeds.past.rows);
				expect(result.current.activeNextOffset).toBe(10);

				flushSync(() => {
					result.current.refreshActiveRows();
					result.current.loadMoreActiveRows();
				});
				expect(feeds.past.loadRows).toHaveBeenCalledWith();
				expect(feeds.past.loadRows).toHaveBeenCalledWith(10);
			},
		);

		it(
			"forwards scope-filter changes to release-watch feeds",
			() => {
				const { result } = renderHook(() => useReleaseWatchController());

				expect(releaseWatchHookMocks.useReleaseWatchFeeds).toHaveBeenLastCalledWith(
					"tracked",
					notifications,
				);

				flushSync(() => {
					result.current.setScopeFilter("all");
				});

				expect(result.current.scopeFilter).toBe("all");
				expect(releaseWatchHookMocks.useReleaseWatchFeeds).toHaveBeenLastCalledWith(
					"all",
					notifications,
				);
			},
		);
	},
);
