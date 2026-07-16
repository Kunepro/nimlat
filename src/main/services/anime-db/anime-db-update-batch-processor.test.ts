import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
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
import { streamAnimeDbUpdateBatch } from "./anime-db-update-batch-processor";

const {
				catalogMediaIngestedNextMock,
				upsertMediaMock,
			} = vi.hoisted(() => ({
	catalogMediaIngestedNextMock: vi.fn(),
	upsertMediaMock:              vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media: {
				upsertMedia: upsertMediaMock,
			},
		},
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_CatalogMediaIngested: {
			next: catalogMediaIngestedNextMock,
		},
	}),
);

function mediaFixture(id: number, updatedAt?: number): AniListMedia {
	return {
		id,
		updatedAt,
		idMal: null,
	} as AniListMedia;
}

describe(
	"streamAnimeDbUpdateBatch",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			upsertMediaMock.mockImplementation((media: AniListMedia) => media.id);
		});

		it(
			"ingests medias and emits the updated provider high-watermark",
			async () => {
				const events = await lastValueFrom(streamAnimeDbUpdateBatch({
					medias:                      [
						mediaFixture(
							101,
							1_500,
						),
						mediaFixture(
							102,
							2_500,
						),
					],
					currentMaxProviderUpdatedAt: 2_000,
				}).pipe(toArray()));

				expect(upsertMediaMock).toHaveBeenCalledTimes(2);
				expect(catalogMediaIngestedNextMock).toHaveBeenCalledTimes(2);
				expect(events).toEqual([
					{
						kind:                 "mediaIngested",
						media:                expect.objectContaining({ id: 101 }),
						providerUpdatedAt:    1_500,
						maxProviderUpdatedAt: 2_000,
					},
					{
						kind:                 "mediaIngested",
						media:                expect.objectContaining({ id: 102 }),
						providerUpdatedAt:    2_500,
						maxProviderUpdatedAt: 2_500,
					},
				]);
			},
		);

		it(
			"stops before the next media when the caller requests pause",
			async () => {
				const abortController = new AbortController();
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 201) {
						abortController.abort();
					}
					return media.id;
				});

				const events = await lastValueFrom(streamAnimeDbUpdateBatch({
					medias:                      [
						mediaFixture(
							201,
							3_000,
						),
						mediaFixture(
							202,
							4_000,
						),
					],
					currentMaxProviderUpdatedAt: 2_500,
					signal:                      abortController.signal,
				}).pipe(toArray()));

				expect(events).toEqual([
					{
						kind:                 "mediaIngested",
						media:                expect.objectContaining({ id: 201 }),
						providerUpdatedAt:    3_000,
						maxProviderUpdatedAt: 3_000,
					},
					{
						kind:                 "stopped",
						maxProviderUpdatedAt: 3_000,
					},
				]);
				expect(upsertMediaMock).toHaveBeenCalledTimes(1);
				expect(upsertMediaMock).toHaveBeenCalledWith(expect.objectContaining({
					id: 201,
				}));
			},
		);
	},
);
