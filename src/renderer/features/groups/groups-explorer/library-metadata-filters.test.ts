// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	normalizeRouteFilterValues,
	parseLibraryMetadataFilters,
	serializeLibraryMetadataFilterSearch,
} from "./library-metadata-filters";

describe(
	"library metadata filters",
	() => {
		it(
			"normalizes route values by trimming and removing case-insensitive duplicates",
			() => {
				expect(normalizeRouteFilterValues([
					" Action ",
					"action",
					"",
					42,
					"Drama",
				])).toEqual([
					"Action",
					"Drama",
				]);
			},
		);

		it(
			"accepts a single route string as a one-item filter list",
			() => {
				expect(normalizeRouteFilterValues(" Sci-Fi ")).toEqual([ "Sci-Fi" ]);
			},
		);

		it(
			"parses supported metadata filters from route search state",
			() => {
				expect(parseLibraryMetadataFilters({
					genreNames: [
						"Action",
						"action",
					],
					tagNames:   "Classic",
				})).toEqual({
					genreNames: [ "Action" ],
					tagNames:   [ "Classic" ],
				});
			},
		);

		it(
			"omits empty filter arrays when serializing route search state",
			() => {
				expect(serializeLibraryMetadataFilterSearch({
					genreNames: [],
					tagNames:   [ "Mecha" ],
				})).toEqual({
					genreNames: undefined,
					tagNames:   [ "Mecha" ],
				});
			},
		);
	},
);
