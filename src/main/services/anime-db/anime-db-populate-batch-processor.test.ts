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
import { streamAnimeDbPopulateBatch } from "./anime-db-populate-batch-processor";
import { NonRetriableAnimeDbPopulateError } from "./anime-db-populate-errors";

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

function mediaFixture(id: number): AniListMedia {
	return {
		id,
		idMal: null,
	} as AniListMedia;
}

describe(
	"streamAnimeDbPopulateBatch",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			upsertMediaMock.mockImplementation((media: AniListMedia) => media.id);
		});

		it(
			"reports media progress without advancing the committed cursor itself",
			async () => {
				const events = await lastValueFrom(streamAnimeDbPopulateBatch({
					medias:               [
						mediaFixture(100),
						mediaFixture(101),
					],
					committedLastMediaId: 100,
				}).pipe(toArray()));

				expect(events).toEqual([
					{
						kind:                    "mediaPersisted",
						media:                   expect.objectContaining({ id: 100 }),
						persistedMediaId:        100,
						wasAlreadyCounted:       true,
						highestProcessedInBatch: 100,
					},
					{
						kind:                    "mediaPersisted",
						media:                   expect.objectContaining({ id: 101 }),
						persistedMediaId:        101,
						wasAlreadyCounted:       false,
						highestProcessedInBatch: 101,
					},
				]);
			},
		);

		it(
			"stops before processing the next media when pause is requested",
			async () => {
				const abortController = new AbortController();
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 201) {
						abortController.abort();
					}
					return media.id;
				});

				const events = await lastValueFrom(streamAnimeDbPopulateBatch({
					medias:               [
						mediaFixture(201),
						mediaFixture(202),
					],
					committedLastMediaId: 0,
					signal:               abortController.signal,
				}).pipe(toArray()));

				expect(events).toEqual([
					{
						kind:                    "mediaPersisted",
						media:                   expect.objectContaining({ id: 201 }),
						persistedMediaId:        201,
						wasAlreadyCounted:       false,
						highestProcessedInBatch: 201,
					},
					{
						kind: "stopped",
					},
				]);
				expect(upsertMediaMock).toHaveBeenCalledTimes(1);
				expect(upsertMediaMock).toHaveBeenCalledWith(expect.objectContaining({
					id: 201,
				}));
			},
		);

		it(
			"wraps media write failures as non-retriable populate errors without logging",
			async () => {
				upsertMediaMock.mockImplementation(() => {
					throw new Error("write failed");
				});

				let caughtError: unknown;
				try {
					await lastValueFrom(streamAnimeDbPopulateBatch({
						medias:               [ mediaFixture(301) ],
						committedLastMediaId: 0,
					}));
				} catch (error) {
					caughtError = error;
				}
				expect(caughtError).toBeInstanceOf(NonRetriableAnimeDbPopulateError);
				expect(caughtError).toMatchObject({
					originalError: expect.objectContaining({
						message: "write failed",
					}),
					logContext:    { mediaIdAniList: 301 },
				});
			},
		);
	},
);
