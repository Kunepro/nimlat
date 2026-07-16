// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getMock = vi.fn();
const runMock = vi.fn();

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: () => ({
			prepare: () => ({
				get: getMock,
				run: runMock,
			}),
		}),
	}),
);

describe(
	"library-display-filters config",
	() => {
		it(
			"defaults to grouped mixed mode for missing or unsupported values",
			async () => {
				const { getLibraryDisplayFilters } = await import("./library-display-filters");

				getMock.mockReturnValue(undefined);
				expect(getLibraryDisplayFilters()).toEqual({
					adultFilter: "mixed",
					displayMode: "groups",
					genreNames:  [],
					tagNames:    [],
				});

				getMock.mockReturnValue({
					settingValue: JSON.stringify({
						adultFilter: "bad",
						displayMode: "alsoBad",
					}),
				});
				expect(getLibraryDisplayFilters()).toEqual({
					adultFilter: "mixed",
					displayMode: "groups",
					genreNames:  [],
					tagNames:    [],
				});
			},
		);

		it(
			"persists normalized library display filters",
			async () => {
				const { setLibraryDisplayFilters } = await import("./library-display-filters");

				setLibraryDisplayFilters({
					adultFilter: "adult",
					displayMode: "rawMedia",
				});

				expect(runMock).toHaveBeenCalledWith(
					"libraryDisplayFilters",
					JSON.stringify({
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					}),
				);
			},
		);
	},
);
