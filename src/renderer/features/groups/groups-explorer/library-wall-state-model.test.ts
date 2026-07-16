import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyLibraryWallRangeLoaded,
	applyLibraryWallRangeLoadError,
	applyLibraryWallVisibleItemsRemoved,
	createInitialLibraryWallState,
	formatLibraryWallLoadError,
	requestLibraryWallReload,
	resetLibraryWallVisibleRange,
} from "./library-wall-state-model";

describe(
	"library-wall-state-model",
	() => {
		it(
			"creates reload snapshots with optional initial loader and wall reset",
			() => {
				const loadedState = applyLibraryWallRangeLoaded(
					createInitialLibraryWallState(),
					25,
				);

				expect(requestLibraryWallReload(loadedState)).toEqual({
					...loadedState,
					errorMessage:  null,
					wallReloadKey: 1,
				});
				expect(requestLibraryWallReload(
					loadedState,
					{
						resetWall:         true,
						showInitialLoader: true,
					},
				)).toEqual({
					...loadedState,
					errorMessage:          null,
					hasLoadedInitialRange: false,
					wallReloadKey:         1,
					wallResetKey:          1,
				});
			},
		);

		it(
			"applies range load, error, removal, and reset transitions",
			() => {
				const loadedState = applyLibraryWallRangeLoaded(
					createInitialLibraryWallState(),
					3,
				);

				expect(loadedState).toMatchObject({
					errorMessage:          null,
					hasLoadedInitialRange: true,
					totalItems:            3,
				});
				expect(applyLibraryWallVisibleItemsRemoved(
					loadedState,
					8,
				).totalItems).toBe(0);
				expect(applyLibraryWallRangeLoadError(
					loadedState,
					new Error("range failed"),
				)).toMatchObject({
					errorMessage:          "range failed",
					hasLoadedInitialRange: true,
					totalItems:            3,
				});
				expect(resetLibraryWallVisibleRange(loadedState)).toMatchObject({
					errorMessage:          null,
					hasLoadedInitialRange: false,
					totalItems:            0,
				});
			},
		);

		it(
			"formats unknown range load errors safely",
			() => {
				expect(formatLibraryWallLoadError("nope")).toBe("Failed to load library.");
			},
		);
	},
);
