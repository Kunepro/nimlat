// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createPersistedLibraryDisplayFilters,
	formatLibraryDisplaySettingsError,
	removeAdultOnlyLibraryFilters,
	resolveLibraryAdultContentStatusChange,
	resolveLibraryDisplaySettingsLoad,
	shouldPersistAdultFilterReset,
} from "./library-display-settings-model";

describe(
	"library-display-settings-model",
	() => {
		it(
			"creates persisted display filters with cleared metadata facets",
			() => {
				expect(createPersistedLibraryDisplayFilters(
					"adult",
					"rawMedia",
				)).toEqual({
					adultFilter: "adult",
					displayMode: "rawMedia",
					genreNames:  [],
					tagNames:    [],
				});
			},
		);

		it(
			"removes adult-only and metadata filters when adult content is disabled",
			() => {
				const filters = {
					adultFilter: "adult" as const,
					displayMode: "rawMedia" as const,
					genreNames:  [ "Ecchi" ],
					tagNames:    [ "Nudity" ],
				};

				expect(shouldPersistAdultFilterReset(filters)).toBe(true);
				expect(removeAdultOnlyLibraryFilters(filters)).toEqual({
					adultFilter: "mixed",
					displayMode: "rawMedia",
					genreNames:  [],
					tagNames:    [],
				});
			},
		);

		it(
			"resolves initial settings load and queues adult-off normalization only when needed",
			() => {
				const options = {
					genreNames: [ "Action" ],
					tagNames:   [ "Found Family" ],
				};
				const filters = {
					adultFilter: "adult" as const,
					displayMode: "rawMedia" as const,
					genreNames:  [ "Ecchi" ],
					tagNames:    [ "Nudity" ],
				};

				expect(resolveLibraryDisplaySettingsLoad({
					adultContentEnabled: false,
					filters,
					filterOptions:       options,
				})).toEqual({
					filtersToPersist: {
						adultFilter: "mixed",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					},
					settings:         {
						adultFilter:           "mixed",
						displayMode:           "rawMedia",
						filterOptions:         options,
						isAdultContentEnabled: false,
					},
				});

				expect(resolveLibraryDisplaySettingsLoad({
					adultContentEnabled: true,
					filters,
					filterOptions:       options,
				})).toEqual({
					filtersToPersist: null,
					settings:         {
						adultFilter:           "adult",
						displayMode:           "rawMedia",
						filterOptions:         options,
						isAdultContentEnabled: true,
					},
				});
			},
		);

		it(
			"resolves adult-content status changes without preserving hidden adult filters",
			() => {
				expect(resolveLibraryAdultContentStatusChange(
					false,
					"rawMedia",
				)).toEqual({
					adultFilter:           "mixed",
					filtersToPersist:      {
						adultFilter: "mixed",
						displayMode: "rawMedia",
						genreNames:  [],
						tagNames:    [],
					},
					isAdultContentEnabled: false,
				});
				expect(resolveLibraryAdultContentStatusChange(
					true,
					"groups",
				)).toEqual({
					adultFilter:           null,
					filtersToPersist:      null,
					isAdultContentEnabled: true,
				});
			},
		);

		it(
			"formats settings errors without leaking unknown values",
			() => {
				expect(formatLibraryDisplaySettingsError(
					new Error("settings failed"),
					"fallback",
				)).toBe("settings failed");
				expect(formatLibraryDisplaySettingsError(
					"settings failed",
					"fallback",
				)).toBe("fallback");
				expect(formatLibraryDisplaySettingsError(
					new Error("   "),
					"fallback",
				)).toBe("fallback");
			},
		);
	},
);
