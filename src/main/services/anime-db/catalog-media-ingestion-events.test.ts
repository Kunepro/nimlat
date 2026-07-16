// @vitest-environment node
import type { CatalogMediaIngestedEvent } from "@nimlat/types/anime-db";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const catalogMediaIngestedBus    = new Subject<CatalogMediaIngestedEvent>();
const incomingSourceMedias       = vi.fn();
const computeGroupsForNewMedia   = vi.fn();
const handleCatalogMediaMutation = vi.fn();
const logMainServiceError        = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_CatalogMediaIngested: catalogMediaIngestedBus,
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media: {
				relations: {
					incomingSourceMedias,
				},
			},
		},
	}),
);

vi.mock(
	"../../utils/compute-group-for-new-media/compute-group-for-new-media",
	() => ({
		computeGroupsForNewMedia,
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: {
			handleCatalogMediaMutation,
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

describe(
	"catalog media ingestion events",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			vi.useFakeTimers();
			incomingSourceMedias.mockReturnValue([]);
		});

		afterEach(async () => {
			const { disposeCatalogMediaIngestionEvents } = await import("./catalog-media-ingestion-events");
			disposeCatalogMediaIngestionEvents();
			vi.useRealTimers();
		});

		it(
			"replays grouping for an ingested media and real incoming relation sources",
			async () => {
				incomingSourceMedias.mockReturnValue([
					{ mediaId: 100 },
					{ mediaId: 101 },
					{ mediaId: 100 },
				]);
				const { initCatalogMediaIngestionEvents } = await import("./catalog-media-ingestion-events");
				initCatalogMediaIngestionEvents();

				catalogMediaIngestedBus.next({
					mediaId:   200,
					idAniList: 200,
					source: "group-explorer-refresh",
				});

				expect(computeGroupsForNewMedia).toHaveBeenCalledTimes(3);
				expect(computeGroupsForNewMedia).toHaveBeenNthCalledWith(
					1,
					200,
				);
				expect(computeGroupsForNewMedia).toHaveBeenNthCalledWith(
					2,
					100,
				);
				expect(computeGroupsForNewMedia).toHaveBeenNthCalledWith(
					3,
					101,
				);
			},
		);

		it(
			"normalizes non-Error grouping replay failures before logging",
			async () => {
				incomingSourceMedias.mockImplementation(() => {
					throw "grouping failed";
				});
				const { initCatalogMediaIngestionEvents } = await import("./catalog-media-ingestion-events");
				initCatalogMediaIngestionEvents();

				catalogMediaIngestedBus.next({
					mediaId:   200,
					idAniList: 200,
					source: "group-explorer-refresh",
				});

				expect(logMainServiceError).toHaveBeenCalledWith(
					"catalog-media-ingestion-events.grouping-replay",
					expect.objectContaining({
						message: "grouping failed",
					}),
					expect.objectContaining({
						mediaId: 200,
					}),
				);
			},
		);

		it(
			"publishes buffered catalog side effects by source",
			async () => {
				const { initCatalogMediaIngestionEvents } = await import("./catalog-media-ingestion-events");
				initCatalogMediaIngestionEvents();

				catalogMediaIngestedBus.next({
					mediaId:   10,
					idAniList: 10,
					source:    "anime-db-updater",
				});
				catalogMediaIngestedBus.next({
					mediaId:   11,
					idAniList: 11,
					source:    "anime-db-updater",
				});
				catalogMediaIngestedBus.next({
					mediaId:   12,
					idAniList: 12,
					source:    "anime-db-populator",
				});

				await vi.advanceTimersByTimeAsync(250);

				expect(handleCatalogMediaMutation).toHaveBeenCalledWith({
					affectedMediaIds:            [
						10,
						11,
					],
					publishRendererInvalidation: true,
					context:                     "anime-db-updater",
				});
				expect(handleCatalogMediaMutation).toHaveBeenCalledWith({
					affectedMediaIds:            [ 12 ],
					publishRendererInvalidation: false,
					context:                     "anime-db-populator",
				});
			},
		);

		it(
			"normalizes non-Error buffered side-effect failures before logging",
			async () => {
				handleCatalogMediaMutation.mockImplementation(() => {
					throw "side effect failed";
				});
				const { initCatalogMediaIngestionEvents } = await import("./catalog-media-ingestion-events");
				initCatalogMediaIngestionEvents();

				catalogMediaIngestedBus.next({
					mediaId:   10,
					idAniList: 10,
					source:    "anime-db-updater",
				});

				await vi.advanceTimersByTimeAsync(250);

				expect(logMainServiceError).toHaveBeenCalledWith(
					"catalog-media-ingestion-events.catalog-side-effects",
					expect.objectContaining({
						message: "side effect failed",
					}),
					{
						source:           "anime-db-updater",
						affectedMediaIds: [ 10 ],
					},
				);
			},
		);
	},
);
