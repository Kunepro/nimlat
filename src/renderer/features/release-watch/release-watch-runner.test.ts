// @vitest-environment jsdom

import type { ReleaseWatchListChangedEvent } from "@nimlat/types/release-watch";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ReleaseWatchFacade } from "../../facades";
import {
	listPastReleaseWatchPage,
	listUpcomingReleaseWatchPage,
	pastReleaseWatchListChanges,
	upcomingReleaseWatchListChanges,
} from "./release-watch-runner";

describe(
	"release-watch-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads past and upcoming pages through the release-watch facade",
			async () => {
				vi.spyOn(
					ReleaseWatchFacade,
					"listPast",
				).mockResolvedValue({
					items:      [],
					nextOffset: null,
					total:      0,
				});
				vi.spyOn(
					ReleaseWatchFacade,
					"listUpcoming",
				).mockResolvedValue({
					items:      [],
					nextOffset: 50,
					total:      55,
				});

				await expect(listPastReleaseWatchPage(
					"tracked",
					50,
					0,
				)).resolves.toEqual({
					items:      [],
					nextOffset: null,
					total:      0,
				});
				await expect(listUpcomingReleaseWatchPage(
					"all",
					50,
					50,
				)).resolves.toEqual({
					items:      [],
					nextOffset: 50,
					total:      55,
				});

				expect(ReleaseWatchFacade.listPast).toHaveBeenCalledWith(
					"tracked",
					50,
					0,
				);
				expect(ReleaseWatchFacade.listUpcoming).toHaveBeenCalledWith(
					"all",
					50,
					50,
				);
			},
		);

		it(
			"exposes past and upcoming list change streams from the release-watch facade",
			() => {
				const pastChanges$     = new Subject<ReleaseWatchListChangedEvent>();
				const upcomingChanges$ = new Subject<ReleaseWatchListChangedEvent>();
				const pastListener     = vi.fn();
				const upcomingListener = vi.fn();
				vi.spyOn(
					ReleaseWatchFacade,
					"pastListChanges",
				).mockReturnValue(pastChanges$);
				vi.spyOn(
					ReleaseWatchFacade,
					"upcomingListChanges",
				).mockReturnValue(upcomingChanges$);

				const pastSubscription     = pastReleaseWatchListChanges().subscribe(pastListener);
				const upcomingSubscription = upcomingReleaseWatchListChanges().subscribe(upcomingListener);
				const pastEvent            = { affectedMediaIds: [ 1 ] };
				const upcomingEvent        = { affectedMediaIds: [ 2 ] };

				pastChanges$.next(pastEvent);
				upcomingChanges$.next(upcomingEvent);

				expect(pastListener).toHaveBeenCalledWith(pastEvent);
				expect(upcomingListener).toHaveBeenCalledWith(upcomingEvent);
				expect(ReleaseWatchFacade.pastListChanges).toHaveBeenCalledTimes(1);
				expect(ReleaseWatchFacade.upcomingListChanges).toHaveBeenCalledTimes(1);

				pastSubscription.unsubscribe();
				upcomingSubscription.unsubscribe();
			},
		);
	},
);
