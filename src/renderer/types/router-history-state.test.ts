import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createRouteHistoryState,
	readRouteHistoryState,
} from "./router-history-state";

describe(
	"router-history-state",
	() => {
		it(
			"merges Nimlat navigation hints without dropping existing history state",
			() => {
				const updateState = createRouteHistoryState({
					groupName: "Cowboy Bebop",
					mediaName: "Session 1",
					isFilm:    false,
				}) as (previousState: Record<string, unknown>) => Record<string, unknown>;

				expect(updateState({
					__TSR_index: 2,
					key:         "existing",
				})).toEqual({
					__TSR_index: 2,
					key:         "existing",
					groupName:   "Cowboy Bebop",
					mediaName:   "Session 1",
					isFilm:      false,
				});
			},
		);

		it(
			"normalizes route state hints read from browser history",
			() => {
				expect(readRouteHistoryState({
					groupName: "Loaded Group",
					mediaName: 42,
					isFilm:    true,
				})).toEqual({
					groupName: "Loaded Group",
					mediaName: undefined,
					isFilm:    true,
				});
				expect(readRouteHistoryState(null)).toEqual({});
			},
		);
	},
);
