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
import type { AniListMediasScanBatch } from "./ani-list-media-scanner";
import { streamAnimeDbPopulateScan } from "./anime-db-populate-scan-runner";

const { scanAllMediasMock } = vi.hoisted(() => ({
	scanAllMediasMock: vi.fn(),
}));

vi.mock(
	"./ani-list-media-scanner",
	() => ({
		scanAllMedias: scanAllMediasMock,
	}),
);

function mediaFixture(id: number): AniListMedia {
	return { id } as AniListMedia;
}

function scanBatchFixture(currentPage: number, mediaIds: number[], requestCount = 1): AniListMediasScanBatch {
	return {
		medias:     mediaIds.map(mediaFixture),
		pageInfo:   {
			total:       100,
			perPage:     50,
			currentPage,
			lastPage:    currentPage,
			hasNextPage: false,
		},
		currentPage,
		requestCount,
		batchMaxId: Math.max(
			0,
			...mediaIds,
		),
	};
}

function scanBatches(...batches: AniListMediasScanBatch[]) {
	return async function* scanBatchGenerator(): AsyncGenerator<AniListMediasScanBatch> {
		for (const batch of batches) {
			yield batch;
		}
	};
}

describe(
	"streamAnimeDbPopulateScan",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"emits scanned batches with progress metadata",
			async () => {
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					3,
					[
						301,
						302,
					],
					5,
				)));

				const events = await lastValueFrom(streamAnimeDbPopulateScan({
					startAfterMediaId: 250,
					includeAdult:      true,
					perPage:           50,
				}).pipe(toArray()));

				expect(scanAllMediasMock).toHaveBeenCalledWith(
					250,
					true,
					50,
				);
				expect(events).toEqual([
					{
						kind:         "batchScanned",
						currentPage:  3,
						requestCount: 5,
						totalMedias:  100,
						batchMaxId:   302,
						batch:        expect.objectContaining({
							medias: [
								expect.objectContaining({ id: 301 }),
								expect.objectContaining({ id: 302 }),
							],
						}),
					},
				]);
			},
		);

		it(
			"emits stopped without scanning when the signal is already aborted",
			async () => {
				const abortController = new AbortController();
				abortController.abort();
				scanAllMediasMock.mockImplementation(scanBatches());

				const events = await lastValueFrom(streamAnimeDbPopulateScan({
					startAfterMediaId: 0,
					includeAdult:      true,
					perPage:           50,
					signal:            abortController.signal,
				}).pipe(toArray()));

				expect(events).toEqual([ { kind: "stopped" } ]);
				expect(scanAllMediasMock).not.toHaveBeenCalled();
			},
		);
	},
);
