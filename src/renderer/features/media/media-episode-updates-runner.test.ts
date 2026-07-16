// @vitest-environment jsdom

import type { MediaEpisodesListChangedEvent } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	getMediaEpisodeUpdatesIssue,
	mediaEpisodeUpdatesListChanges,
	retryMediaEpisodeUpdates,
} from "./media-episode-updates-runner";

describe(
	"media-episode-updates-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads, retries, and exposes episode update events through the group explorer facade",
			async () => {
				const changes$ = new Subject<MediaEpisodesListChangedEvent>();
				const listener = vi.fn();
				vi.spyOn(
					GroupExplorerFacade,
					"getMediaEpisodeUpdatesIssue",
				).mockResolvedValue(null);
				vi.spyOn(
					GroupExplorerFacade,
					"retryMediaEpisodeUpdates",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"mediaEpisodesListChanges",
				).mockReturnValue(changes$);

				await expect(getMediaEpisodeUpdatesIssue(42)).resolves.toBeNull();
				await expect(retryMediaEpisodeUpdates(42)).resolves.toEqual({ success: true });
				const subscription = mediaEpisodeUpdatesListChanges().subscribe(listener);
				const event        = { mediaId: 42 };

				changes$.next(event);

				expect(GroupExplorerFacade.getMediaEpisodeUpdatesIssue).toHaveBeenCalledWith(42);
				expect(GroupExplorerFacade.retryMediaEpisodeUpdates).toHaveBeenCalledWith(42);
				expect(GroupExplorerFacade.mediaEpisodesListChanges).toHaveBeenCalledTimes(1);
				expect(listener).toHaveBeenCalledWith(event);

				subscription.unsubscribe();
			},
		);
	},
);
