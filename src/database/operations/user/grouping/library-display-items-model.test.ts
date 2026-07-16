// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createLibraryDisplayQueryArgs,
	createLibraryDisplayQueryInput,
	type LibraryDisplayItemRow,
	mapLibraryDisplayRows,
	normalizeFilterNames,
	normalizeLibraryFilters,
	resolveMediaImageUrl,
} from "./library-display-items-model";

function createBaseRow(overrides: Partial<LibraryDisplayItemRow>): LibraryDisplayItemRow {
	return {
		itemKind:           "media",
		itemSource:         null,
		groupId:            null,
		mediaId:            1,
		name:               "Library Item",
		description:        null,
		imageUrl:           null,
		format:             null,
		isAdult:            0,
		coverImageJson:     null,
		bannerImage:        null,
		isWatched:          0,
		integrationPercent: null,
		integrationStatus:  null,
		mediasCount:        null,
		lastRefreshAt:      null,
		...overrides,
	};
}

describe(
	"library display items model",
	() => {
		it(
			"normalizes metadata filter names without reordering first unique appearances",
			() => {
				expect(normalizeFilterNames([
					" Action ",
					"",
					"ACTION",
					"Drama",
					10,
					"drama",
				])).toEqual([
					"Action",
					"Drama",
				]);
			},
		);

		it(
			"falls back invalid library filters to safe defaults",
			() => {
				expect(normalizeLibraryFilters({
					adultFilter: "bad" as never,
					displayMode: "bad" as never,
					genreNames:  [ "Sci-Fi" ],
					tagNames:    "invalid" as never,
				})).toEqual({
					adultFilter: "mixed",
					displayMode: "groups",
					genreNames:  [ "Sci-Fi" ],
					tagNames:    [],
				});
			},
		);

		it(
			"creates the repeated SQL argument tuple from search and filters",
			() => {
				const input = createLibraryDisplayQueryInput(
					"Pókè-mon!",
					{
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [
							"Action",
							"Action",
						],
						tagNames:    [ "Found Family" ],
					},
				);

				expect(createLibraryDisplayQueryArgs(
					"library",
					input,
				)).toEqual([
					"library",
					"adult",
					"rawMedia",
					"[\"Action\"]",
					"[\"Found Family\"]",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
				]);
			},
		);

		it(
			"resolves media image fallback priority from explicit, cover, and banner sources",
			() => {
				expect(resolveMediaImageUrl(
					"custom.jpg",
					"{\"extraLarge\":\"cover.jpg\"}",
					"banner.jpg",
				)).toBe("custom.jpg");
				expect(resolveMediaImageUrl(
					null,
					"{\"large\":\"cover.jpg\"}",
					"banner.jpg",
				)).toBe("cover.jpg");
				expect(resolveMediaImageUrl(
					null,
					"{broken",
					"banner.jpg",
				)).toBe("banner.jpg");
			},
		);

		it(
			"maps group and media rows into stable Library items",
			() => {
				expect(mapLibraryDisplayRows([
					createBaseRow({
						itemKind:           "group",
						itemSource:         "user",
						groupId:            4,
						mediaId:            null,
						imageUrl:           "group.jpg",
						isAdult:            1,
						isWatched:          1,
						integrationPercent: 80,
						integrationStatus:  "downloaded",
						mediasCount:        2,
						lastRefreshAt:      1000,
					}),
					createBaseRow({
						mediaId:        8,
						format:         "MOVIE",
						coverImageJson: "{\"medium\":\"cover.jpg\"}",
						bannerImage:    "banner.jpg",
						lastRefreshAt:  2000,
					}),
				])).toEqual([
					{
						key:                "group:user:4",
						kind:               "group",
						name:               "Library Item",
						description:        undefined,
						imageUrl:           "group.jpg",
						format:             undefined,
						isAdult:            true,
						isWatched:          true,
						integrationPercent: 80,
						integrationStatus:  "downloaded",
						lastRefresh:        "1970-01-01T00:00:01.000Z",
						group:              {
							source:  "user",
							groupId: 4,
						},
						mediasCount:        2,
					},
					{
						key:                "media:8",
						kind:               "media",
						name:               "Library Item",
						description:        undefined,
						imageUrl:           "cover.jpg",
						format:             "MOVIE",
						isAdult:            false,
						isFilm:             true,
						isWatched:          false,
						integrationPercent: undefined,
						integrationStatus:  undefined,
						lastRefresh:        "1970-01-01T00:00:02.000Z",
						mediaId:            8,
					},
				]);
			},
		);

		it(
			"throws when SQL returns an incomplete row identity",
			() => {
				expect(() => mapLibraryDisplayRows([
					createBaseRow({
						itemKind:   "group",
						itemSource: null,
						groupId:    null,
					}),
				])).toThrow("Library query returned a group row without group identity.");
				expect(() => mapLibraryDisplayRows([
					createBaseRow({
						mediaId: null,
					}),
				])).toThrow("Library query returned a media row without mediaId.");
			},
		);
	},
);
