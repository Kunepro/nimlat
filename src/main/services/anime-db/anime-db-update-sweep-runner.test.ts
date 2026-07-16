import type {
	AniListMedia,
	PageInfo,
} from "@nimlat/types/ani-list-media-api";
import {
	lastValueFrom,
	toArray,
} from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	streamAnimeDbTailSweep,
	streamAnimeDbUpdatedAtSweep,
} from "./anime-db-update-sweep-runner";

const { queryProviderPageMock } = vi.hoisted(() => ({
	queryProviderPageMock: vi.fn(),
}));

vi.mock(
	"./anime-db-update-provider-page",
	() => ({
		queryAnimeDbUpdateProviderPage: queryProviderPageMock,
	}),
);

function mediaFixture(id: number, updatedAt: number): AniListMedia {
	return {
		id,
		updatedAt,
		idMal: null,
	} as AniListMedia;
}

function pageInfoFixture(page: number, hasNextPage: boolean, lastPage = page): PageInfo {
	return {
		total:       100,
		perPage:     50,
		currentPage: page,
		lastPage,
		hasNextPage,
	};
}

function deferredProviderPage(result: {
	pageInfo: PageInfo;
	medias: AniListMedia[];
}): {
	promise: Promise<typeof result>;
	resolve: () => void;
} {
	let resolvePage: ((value: typeof result) => void) | null = null;
	const promise                                            = new Promise<typeof result>((resolve) => {
		resolvePage = resolve;
	});

	return {
		promise,
		resolve: () => {
			resolvePage?.(result);
		},
	};
}

describe(
	"anime-db-update-sweep-runner",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"emits the updatedAt boundary page before completing the overlap sweep",
			async () => {
				queryProviderPageMock
					.mockResolvedValueOnce({
						pageInfo: pageInfoFixture(
							1,
							true,
						),
						medias:   [
							mediaFixture(
								101,
								1_100_000,
							),
						],
					})
					.mockResolvedValueOnce({
						pageInfo: pageInfoFixture(
							2,
							true,
						),
						medias:   [
							mediaFixture(
								102,
								300_000,
							),
						],
					});

				const events = await lastValueFrom(streamAnimeDbUpdatedAtSweep(
					{
						lastSuccessfulProviderUpdatedAt: 1_000_000,
						lastKnownTailPage:               20,
						lastSuccessfulRunCompletedAt:    null,
					},
				).pipe(toArray()));

				expect(queryProviderPageMock).toHaveBeenNthCalledWith(
					1,
					1,
					[ "UPDATED_AT_DESC" ],
				);
				expect(queryProviderPageMock).toHaveBeenNthCalledWith(
					2,
					2,
					[ "UPDATED_AT_DESC" ],
				);
				expect(events).toEqual([
					{
						kind:                    "sweepStarted",
						phase:                   "updatedAt",
						page:                    1,
						cutoffProviderUpdatedAt: 395200,
					},
					{
						kind:     "pageScanned",
						phase:    "updatedAt",
						page:     1,
						pageInfo: pageInfoFixture(
							1,
							true,
						),
						medias:   [
							expect.objectContaining({ id: 101 }),
						],
					},
					{
						kind:     "pageScanned",
						phase:    "updatedAt",
						page:     2,
						pageInfo: pageInfoFixture(
							2,
							true,
						),
						medias:   [
							expect.objectContaining({ id: 102 }),
						],
					},
					{
						kind:  "completed",
						phase: "updatedAt",
					},
				]);
			},
		);

		it(
			"emits the ID tail sweep from the overlapped tail page",
			async () => {
				queryProviderPageMock.mockResolvedValueOnce({
					pageInfo: pageInfoFixture(
						8,
						false,
						7,
					),
					medias:   [],
				});

				const events = await lastValueFrom(streamAnimeDbTailSweep(
					{
						lastSuccessfulProviderUpdatedAt: 1_000_000,
						lastKnownTailPage:               10,
						lastSuccessfulRunCompletedAt:    null,
					},
				).pipe(toArray()));

				expect(queryProviderPageMock).toHaveBeenCalledWith(
					8,
					[ "ID" ],
				);
				expect(events).toEqual([
					{
						kind:  "sweepStarted",
						phase: "tail",
						page:  8,
					},
					{
						kind:         "completed",
						phase:        "tail",
						lastTailPage: 7,
					},
				]);
			},
		);

		it(
			"emits stopped instead of a stale updatedAt page when cancellation arrives while the provider query is in flight",
			async () => {
				const abortController = new AbortController();
				const providerPage    = deferredProviderPage({
					pageInfo: pageInfoFixture(
						1,
						false,
					),
					medias:   [
						mediaFixture(
							101,
							1_100_000,
						),
					],
				});
				queryProviderPageMock.mockReturnValueOnce(providerPage.promise);

				const eventsPromise = lastValueFrom(streamAnimeDbUpdatedAtSweep(
					{
						lastSuccessfulProviderUpdatedAt: 1_000_000,
						lastKnownTailPage:               20,
						lastSuccessfulRunCompletedAt:    null,
					},
					{ signal: abortController.signal },
				).pipe(toArray()));

				await vi.waitFor(() => {
					expect(queryProviderPageMock).toHaveBeenCalledOnce();
				});
				abortController.abort();
				providerPage.resolve();

				await expect(eventsPromise).resolves.toEqual([
					{
						kind:                    "sweepStarted",
						phase:                   "updatedAt",
						page:                    1,
						cutoffProviderUpdatedAt: 395200,
					},
					{
						kind:  "stopped",
						phase: "updatedAt",
					},
				]);
			},
		);

		it(
			"emits stopped instead of completing the tail sweep when cancellation arrives while the provider query is in flight",
			async () => {
				const abortController = new AbortController();
				const providerPage    = deferredProviderPage({
					pageInfo: pageInfoFixture(
						8,
						false,
						7,
					),
					medias:   [],
				});
				queryProviderPageMock.mockReturnValueOnce(providerPage.promise);

				const eventsPromise = lastValueFrom(streamAnimeDbTailSweep(
					{
						lastSuccessfulProviderUpdatedAt: 1_000_000,
						lastKnownTailPage:               10,
						lastSuccessfulRunCompletedAt:    null,
					},
					{ signal: abortController.signal },
				).pipe(toArray()));

				await vi.waitFor(() => {
					expect(queryProviderPageMock).toHaveBeenCalledOnce();
				});
				abortController.abort();
				providerPage.resolve();

				await expect(eventsPromise).resolves.toEqual([
					{
						kind:  "sweepStarted",
						phase: "tail",
						page:  8,
					},
					{
						kind:         "stopped",
						phase:        "tail",
						lastTailPage: 10,
					},
				]);
			},
		);
	},
);
