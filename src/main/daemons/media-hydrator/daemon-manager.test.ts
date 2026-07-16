// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => {
	const subscribers = new Set<() => void>();
	const bus = {
		subscribe:      vi.fn((observerOrNext: (() => void) | { next?: () => void }) => {
			const callback = typeof observerOrNext === "function"
				? observerOrNext
				: () => observerOrNext.next?.();
			subscribers.add(callback);

			return {
				unsubscribe: vi.fn(() => {
					subscribers.delete(callback);
				}),
			};
		}),
		next:           () => {
			subscribers.forEach((subscriber) => subscriber());
		},
		"@@observable": function observable() {
			return this;
		},
	};

	return {
		bus,
		subscribers,
		AnimeDbFacade:                      {
			getGroupCharactersQueueCount:         vi.fn(),
			getStaffQueueCount:                   vi.fn(),
			getGroupJikanEpisodesQueueCount:      vi.fn(),
			getJikanEpisodeThumbnailsQueueCount:  vi.fn(),
			getNextGroupJikanEpisodesRetryAt:     vi.fn(),
			getNextJikanEpisodeThumbnailsRetryAt: vi.fn(),
		},
		processMediaCharactersQueue:        vi.fn(),
		processMediaStaffQueue: vi.fn(),
		processJikanEpisodesQueue:          vi.fn(),
		processJikanEpisodeThumbnailsQueue: vi.fn(),
	};
});

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_HydratorQueueChanges: mocks.bus,
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({ AnimeDbFacade: mocks.AnimeDbFacade }),
);

vi.mock(
	"./daemons/group-characters-daemon",
	() => ({ processMediaCharactersQueue: mocks.processMediaCharactersQueue }),
);

vi.mock(
	"./daemons/group-staff-daemon",
	() => ({ processMediaStaffQueue: mocks.processMediaStaffQueue }),
);

vi.mock(
	"./daemons/group-jikan-episodes-daemon",
	() => ({ processJikanEpisodesQueue: mocks.processJikanEpisodesQueue }),
);

vi.mock(
	"./daemons/group-jikan-episode-thumbnails-daemon",
	() => ({ processJikanEpisodeThumbnailsQueue: mocks.processJikanEpisodeThumbnailsQueue }),
);

describe(
	"DaemonManager",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(1_000);
			vi.clearAllMocks();
			mocks.subscribers.clear();
			mocks.AnimeDbFacade.getGroupCharactersQueueCount.mockReturnValue(0);
			mocks.AnimeDbFacade.getStaffQueueCount.mockReturnValue(0);
			mocks.AnimeDbFacade.getGroupJikanEpisodesQueueCount.mockReturnValue(0);
			mocks.AnimeDbFacade.getJikanEpisodeThumbnailsQueueCount.mockReturnValue(0);
			mocks.AnimeDbFacade.getNextGroupJikanEpisodesRetryAt.mockReturnValue(null);
			mocks.AnimeDbFacade.getNextJikanEpisodeThumbnailsRetryAt.mockReturnValue(null);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it(
			"clears periodic sweeps and queue-change subscriptions on dispose",
			async () => {
				const { DaemonManager } = await import("./daemon-manager");
				const daemonManager     = new DaemonManager();

				expect(mocks.AnimeDbFacade.getGroupCharactersQueueCount).toHaveBeenCalledTimes(1);
				expect(mocks.subscribers.size).toBe(1);

				vi.clearAllMocks();
				vi.advanceTimersByTime(60_000);

				expect(mocks.AnimeDbFacade.getGroupCharactersQueueCount).toHaveBeenCalledTimes(1);

				daemonManager.dispose();
				vi.clearAllMocks();
				vi.advanceTimersByTime(60_000);
				mocks.bus.next();

				expect(mocks.subscribers.size).toBe(0);
				expect(mocks.AnimeDbFacade.getGroupCharactersQueueCount).not.toHaveBeenCalled();
			},
		);

		it(
			"reacts to queue-change events through the scheduler stream",
			async () => {
				const { DaemonManager } = await import("./daemon-manager");
				const daemonManager     = new DaemonManager();

				vi.clearAllMocks();
				mocks.bus.next();

				expect(mocks.AnimeDbFacade.getGroupCharactersQueueCount).toHaveBeenCalledTimes(1);

				daemonManager.dispose();
			},
		);

		it(
			"clears delayed retry timers on dispose",
			async () => {
				mocks.AnimeDbFacade.getNextGroupJikanEpisodesRetryAt.mockReturnValue(2_000);
				mocks.AnimeDbFacade.getNextJikanEpisodeThumbnailsRetryAt.mockReturnValue(2_000);

				const { DaemonManager } = await import("./daemon-manager");
				const daemonManager     = new DaemonManager();

				daemonManager.dispose();
				vi.clearAllMocks();
				vi.advanceTimersByTime(1_000);

				expect(mocks.AnimeDbFacade.getGroupJikanEpisodesQueueCount).not.toHaveBeenCalled();
				expect(mocks.AnimeDbFacade.getJikanEpisodeThumbnailsQueueCount).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps one delayed retry timer per cooldown-blocked queue",
			async () => {
				mocks.AnimeDbFacade.getNextGroupJikanEpisodesRetryAt.mockReturnValue(2_000);
				mocks.AnimeDbFacade.getNextJikanEpisodeThumbnailsRetryAt.mockReturnValue(2_000);

				const { DaemonManager } = await import("./daemon-manager");
				const daemonManager     = new DaemonManager();

				vi.clearAllMocks();
				mocks.bus.next();
				vi.advanceTimersByTime(1_000);

				expect(mocks.AnimeDbFacade.getGroupJikanEpisodesQueueCount).toHaveBeenCalledTimes(2);
				expect(mocks.AnimeDbFacade.getJikanEpisodeThumbnailsQueueCount).toHaveBeenCalledTimes(2);

				daemonManager.dispose();
			},
		);
	},
);
