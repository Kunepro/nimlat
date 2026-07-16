// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { mapGroupMediaCardRow } from "./group-media-card-model";
import {
	createGroupMediaCardRangeQueryInput,
	createGroupMediaWallRange,
	type GroupMediaCardRangeRow,
} from "./group-media-card-range-model";

function createRow(overrides: Partial<GroupMediaCardRangeRow> = {}): GroupMediaCardRangeRow {
	return {
		bannerImage:             "banner.jpg",
		coverImageJson:          "{\"large\":\"cover-large.jpg\"}",
		customImageUrl:          null,
		format:                  "MOVIE",
		hasHydrationIssue:       1,
		hasPlaybackIssue:        0,
		isAdult:                 1,
		isWatched:               0,
		lastRefreshAt:           2_000,
		mediaDescription:        "A bounded media wall item.",
		mediaId:                 501,
		mediaIntegrationPercent: 75,
		mediaIntegrationStatus:  "tracked",
		mediaName:               "Bounded Media",
		...overrides,
	};
}

describe(
	"group media card range model",
	() => {
		it(
			"normalizes search once for count and range queries",
			() => {
				expect(createGroupMediaCardRangeQueryInput(" Cowboy Bebop! ")).toEqual({
					likePattern:      "%cowboybebop%",
					normalizedSearch: "cowboybebop",
				});
			},
		);

		it(
			"maps SQL rows into media wall cards with stable renderer fallbacks",
			() => {
				expect(mapGroupMediaCardRow(createRow())).toEqual({
					description:        "A bounded media wall item.",
					format:             "MOVIE",
					hasHydrationIssue:  true,
					hasPlaybackIssue:   false,
					imageUrl:           "cover-large.jpg",
					integrationPercent: 75,
					integrationStatus:  "tracked",
					isAdult:            true,
					isFilm:             true,
					isWatched:          false,
					lastRefresh:        "1970-01-01T00:00:02.000Z",
					mediaId:            501,
					name:               "Bounded Media",
				});
			},
		);

		it(
			"falls back broken images, missing names, and nullable metadata safely",
			() => {
				expect(mapGroupMediaCardRow(createRow({
					coverImageJson:          "{broken",
					format:                  null,
					hasHydrationIssue:       0,
					hasPlaybackIssue:        1,
					isAdult:                 0,
					isWatched:               1,
					lastRefreshAt:           null,
					mediaDescription:        null,
					mediaId:                 777,
					mediaIntegrationPercent: null,
					mediaIntegrationStatus:  null,
					mediaName:               null,
				}))).toEqual({
					description:        undefined,
					format:             undefined,
					hasHydrationIssue:  false,
					hasPlaybackIssue:   true,
					imageUrl:           "banner.jpg",
					integrationPercent: undefined,
					integrationStatus:  undefined,
					isAdult:            false,
					isFilm:             false,
					isWatched:          true,
					lastRefresh:        "1970-01-01T00:00:00.000Z",
					mediaId:            777,
					name:               "Media 777",
				});
			},
		);

		it(
			"keeps media wall ranges bounded at the DB boundary",
			() => {
				expect(createGroupMediaWallRange({
					offset: 40,
					rows:   [
						createRow(),
					],
					total:  300,
				})).toEqual({
					items:  [
						{
							description:        "A bounded media wall item.",
							format:             "MOVIE",
							hasHydrationIssue:  true,
							hasPlaybackIssue:   false,
							imageUrl:           "cover-large.jpg",
							integrationPercent: 75,
							integrationStatus:  "tracked",
							isAdult:            true,
							isFilm:             true,
							isWatched:          false,
							lastRefresh:        "1970-01-01T00:00:02.000Z",
							mediaId:            501,
							name:               "Bounded Media",
						},
					],
					offset: 40,
					total:  300,
				});
			},
		);
	},
);
