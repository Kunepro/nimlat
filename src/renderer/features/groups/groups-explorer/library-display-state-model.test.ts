import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createLibraryDataKey,
	createLibraryDisplayFilters,
	createLibraryDisplayState,
	createLibraryMetadataFiltersKey,
	getLibraryEmptyState,
	hasActiveLibraryFilters,
} from "./library-display-state-model";

const emptyMetadataFilters = {
	genreNames: [],
	tagNames:   [],
};

describe(
	"library display state model",
	() => {
		it(
			"builds stable keys for metadata and wall data",
			() => {
				const metadataFilters = {
					genreNames: [
						"Drama",
						"Mystery",
					],
					tagNames:   [ "Time Skip" ],
				};

				expect(createLibraryMetadataFiltersKey(metadataFilters)).toBe("[[\"Drama\",\"Mystery\"],[\"Time Skip\"]]");
				expect(createLibraryDataKey({
					scope:                "library",
					displayMode:          "rawMedia",
					effectiveAdultFilter: "nonAdult",
					metadataFilters,
					wallResetKey:         3,
				})).toBe("library:rawMedia:nonAdult:[[\"Drama\",\"Mystery\"],[\"Time Skip\"]]:3");
			},
		);

		it(
			"keeps display filter payloads aligned with wall reads",
			() => {
				expect(createLibraryDisplayFilters({
					displayMode:          "groups",
					effectiveAdultFilter: "mixed",
					metadataFilters:      {
						genreNames: [ "Action" ],
						tagNames:   [ "Found Family" ],
					},
				})).toEqual({
					adultFilter: "mixed",
					displayMode: "groups",
					genreNames:  [ "Action" ],
					tagNames:    [ "Found Family" ],
				});
			},
		);

		it(
			"derives the complete display state contract for the wall",
			() => {
				expect(createLibraryDisplayState({
					scope:                "ignored",
					displayMode:          "rawMedia",
					effectiveAdultFilter: "adult",
					metadataFilters:      {
						genreNames: [ "Action" ],
						tagNames:   [ "Super Power" ],
					},
					search:               "mob",
					wallResetKey:         2,
				})).toEqual({
					emptyState:       {
						description:               "No matching ignored items.",
						showAnimeDbDownloadPrompt: false,
					},
					hasActiveFilters: true,
					libraryDataKey:   "ignored:rawMedia:adult:[[\"Action\"],[\"Super Power\"]]:2",
					libraryFilters:   {
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [ "Action" ],
						tagNames:    [ "Super Power" ],
					},
				});
			},
		);

		it(
			"detects user-visible filters that make the empty state a filtered result",
			() => {
				expect(hasActiveLibraryFilters({
					displayMode:          "groups",
					effectiveAdultFilter: "mixed",
					metadataFilters:      emptyMetadataFilters,
				})).toBe(false);
				expect(hasActiveLibraryFilters({
					displayMode:          "rawMedia",
					effectiveAdultFilter: "mixed",
					metadataFilters:      emptyMetadataFilters,
				})).toBe(true);
				expect(hasActiveLibraryFilters({
					displayMode:          "groups",
					effectiveAdultFilter: "nonAdult",
					metadataFilters:      emptyMetadataFilters,
				})).toBe(true);
				expect(hasActiveLibraryFilters({
					displayMode:          "groups",
					effectiveAdultFilter: "mixed",
					metadataFilters:      {
						genreNames: [],
						tagNames:   [ "Robots" ],
					},
				})).toBe(true);
			},
		);

		it(
			"derives empty state copy and download prompt visibility",
			() => {
				expect(getLibraryEmptyState({
					hasActiveFilters: false,
					isIgnoredScope:   false,
					search:           "",
				})).toEqual({
					description:               "Library is empty.",
					showAnimeDbDownloadPrompt: true,
				});
				expect(getLibraryEmptyState({
					hasActiveFilters: false,
					isIgnoredScope:   true,
					search:           "",
				})).toEqual({
					description:               "No ignored content.",
					showAnimeDbDownloadPrompt: false,
				});
				expect(getLibraryEmptyState({
					hasActiveFilters: true,
					isIgnoredScope:   false,
					search:           "",
				})).toEqual({
					description:               "No matching library items.",
					showAnimeDbDownloadPrompt: false,
				});
				expect(getLibraryEmptyState({
					hasActiveFilters: false,
					isIgnoredScope:   true,
					search:           "akira",
				})).toEqual({
					description:               "No matching ignored items.",
					showAnimeDbDownloadPrompt: false,
				});
			},
		);
	},
);
