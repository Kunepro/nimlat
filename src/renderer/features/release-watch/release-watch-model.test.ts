// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildReleaseWatchRowViewModel,
	formatReleaseDate,
	formatReleaseWatchActionError,
	formatReleaseWatchMediaType,
	formatReleaseWatchState,
	getReleaseWatchStateColor,
	isReleaseWatchTab,
	mergeReleaseWatchPageRows,
	RELEASE_WATCH_TABLE_HEADERS,
} from "./release-watch-model";

describe(
	"release-watch-model",
	() => {
		it(
			"keeps release-watch table headers stable",
			() => {
				expect(RELEASE_WATCH_TABLE_HEADERS).toEqual([
					"Media",
					"State",
					"Release",
					"Integration",
				]);
			},
		);

		it(
			"recognizes route tab keys",
			() => {
				expect(isReleaseWatchTab("past")).toBe(true);
				expect(isReleaseWatchTab("upcoming")).toBe(true);
				expect(isReleaseWatchTab("other")).toBe(false);
			},
		);

		it(
			"replaces first release-watch page and appends later pages",
			() => {
				expect(mergeReleaseWatchPageRows(
					[ 1 ],
					[ 2 ],
					0,
				)).toEqual([ 2 ]);
				expect(mergeReleaseWatchPageRows(
					[ 1 ],
					[
						2,
						3,
					],
					50,
				)).toEqual([
					1,
					2,
					3,
				]);
			},
		);

		it(
			"formats release-watch action errors",
			() => {
				expect(formatReleaseWatchActionError(
					new Error("release-watch failed"),
					"fallback",
				)).toBe("release-watch failed");
				expect(formatReleaseWatchActionError(
					"release-watch failed",
					"fallback",
				)).toBe("fallback");
				expect(formatReleaseWatchActionError(
					new Error("   "),
					"fallback",
				)).toBe("fallback");
			},
		);

		it(
			"formats empty and enum-like release-watch values",
			() => {
				expect(formatReleaseDate(null)).toBe("Unknown date");
				expect(formatReleaseWatchState("released_retry_scheduled")).toBe("Released Retry Scheduled");
				expect(formatReleaseWatchMediaType("MOVIE")).toBe("Film");
				expect(formatReleaseWatchMediaType("TV")).toBe("Anime");
				expect(formatReleaseWatchMediaType(null)).toBe("Unknown type");
			},
		);

		it(
			"builds row view models for visible release-watch rows",
			() => {
				expect(buildReleaseWatchRowViewModel({
					watchDomain:          "upcoming",
					mediaId:              101,
					name:                 "Planetes",
					format:               "MOVIE",
					state:                "upcoming_media_release",
					resolvedReleaseAt:    null,
					releaseDatePrecision: "unknown",
					releaseDateSource:    "none",
					integrationStatus:    "downloaded",
					integrationPercent:   66.6,
					updatedAt:            1,
				})).toMatchObject({
					integrationPercent: 67,
					isFilm:             true,
					mediaMeta:          "Film - ID 101",
					releaseDateText:    "Unknown date",
					shouldShowProgress: true,
					stateColor:         "blue",
					stateLabel:         "Upcoming Media Release",
				});
			},
		);

		it(
			"maps release-watch states to stable tag colors",
			() => {
				expect(getReleaseWatchStateColor("released_retry_scheduled")).toBe("orange");
				expect(getReleaseWatchStateColor("upcoming_media_release")).toBe("blue");
			},
		);
	},
);
