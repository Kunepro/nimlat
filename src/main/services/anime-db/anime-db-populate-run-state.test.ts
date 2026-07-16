import {
	describe,
	expect,
	it,
} from "vitest";
import { AnimeDbPopulateRunState } from "./anime-db-populate-run-state";
import type { AnimeDbPopulateCursorState } from "./populate-anime-db-policy";

function cursorFixture(overrides?: Partial<AnimeDbPopulateCursorState>): AnimeDbPopulateCursorState {
	return {
		persistedCompletedPage: 0,
		persistedLastMediaId:   0,
		persistedMediaCount:    0,
		...overrides,
	};
}

describe(
	"AnimeDbPopulateRunState",
	() => {
		it(
			"initializes progress from the persisted scan cursor",
			() => {
				const state = new AnimeDbPopulateRunState(cursorFixture({
					persistedCompletedPage: 4,
					persistedLastMediaId:   222,
					persistedMediaCount:    200,
				}));

				expect(state.getProgress()).toEqual(expect.objectContaining({
					currentPage:             5,
					requestBatch:            0,
					processedMedias:         200,
					totalMediasIsLowerBound: true,
					lastProcessedId:         222,
				}));
			},
		);

		it(
			"advances the durable cursor only when a batch is committed",
			() => {
				const state = new AnimeDbPopulateRunState(cursorFixture({
					persistedCompletedPage: 2,
					persistedLastMediaId:   250,
				}));

				state.commitCompletedBatch(
					3,
					4,
					301,
				);

				expect(state.getCursorState()).toEqual({
					persistedCompletedPage: 3,
					persistedLastMediaId:   301,
					persistedMediaCount:    0,
				});
				expect(state.getProgress()).toEqual(expect.objectContaining({
					requestBatch:    4,
					lastProcessedId: 301,
				}));
			},
		);

		it(
			"counts only newly persisted media while keeping replayed media visible as progress",
			() => {
				const state = new AnimeDbPopulateRunState(cursorFixture({
					persistedMediaCount: 4,
				}));

				const replayShouldBroadcast = state.applyMediaPersisted({
					wasAlreadyCounted:       true,
					highestProcessedInBatch: 100,
					persistedMediaId:        100,
				});
				const newShouldBroadcast    = state.applyMediaPersisted({
					wasAlreadyCounted:       false,
					highestProcessedInBatch: 101,
					persistedMediaId:        101,
				});

				expect(replayShouldBroadcast).toBe(false);
				expect(newShouldBroadcast).toBe(true);
				expect(state.getProgress()).toEqual(expect.objectContaining({
					processedMedias: 5,
					lastProcessedId: 101,
				}));
			},
		);

		it(
			"keeps provider totals as lower bounds until completion",
			() => {
				const state = new AnimeDbPopulateRunState(cursorFixture({
					persistedLastMediaId: 300,
					persistedMediaCount:  19394,
				}));

				state.updateBatchProgress(
					8,
					2,
					19395,
				);
				expect(state.getProgress()).toEqual(expect.objectContaining({
					currentPage:             8,
					requestBatch:            2,
					totalMedias:             19395,
					totalMediasIsLowerBound: true,
					lastProcessedId:         300,
				}));

				state.applyMediaPersisted({
					wasAlreadyCounted:       false,
					highestProcessedInBatch: 301,
					persistedMediaId:        301,
				});
				state.applyMediaPersisted({
					wasAlreadyCounted:       false,
					highestProcessedInBatch: 302,
					persistedMediaId:        302,
				});

				expect(state.getProgress()).toEqual(expect.objectContaining({
					processedMedias: 19396,
					totalMedias:     19396,
				}));

				state.commitCompletedBatch(
					8,
					2,
					302,
				);
				state.markCompleted();
				expect(state.getProgress()).toEqual(expect.objectContaining({
					currentStatus:           "completed",
					totalMediasIsLowerBound: false,
					lastProcessedId:         302,
				}));
			},
		);
	},
);
