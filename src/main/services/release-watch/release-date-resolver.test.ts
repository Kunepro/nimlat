// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { ReleaseDateResolver } from "./release-date-resolver";

describe(
	"ReleaseDateResolver",
	() => {
		it(
			"prefers next airing timestamps over media start dates and provider fallbacks",
			() => {
				expect(ReleaseDateResolver.resolve({
					nextAiringEpisode: { airingAt: 1_800_000_000 },
					startDate:         {
						year:  2026,
						month: 4,
						day:   7,
					},
					providerReleaseAt: 999,
				})).toEqual({
					resolvedReleaseAt:    1_800_000_000_000,
					releaseDatePrecision: "timestamp",
					releaseDateSource:    "next_airing_episode",
				});
			},
		);

		it(
			"uses the most precise valid media start date available",
			() => {
				expect(ReleaseDateResolver.resolve({
					startDate: {
						year:  2026,
						month: 4,
						day:   7,
					},
				})).toEqual({
					resolvedReleaseAt:    Date.UTC(
						2026,
						3,
						7,
					),
					releaseDatePrecision: "date",
					releaseDateSource:    "media_start_date",
				});

				expect(ReleaseDateResolver.resolve({
					startDate: {
						year:  2026,
						month: 4,
					},
				})).toEqual({
					resolvedReleaseAt:    Date.UTC(
						2026,
						3,
						1,
					),
					releaseDatePrecision: "month",
					releaseDateSource:    "media_start_date",
				});

				expect(ReleaseDateResolver.resolve({
					startDate: {
						year: 2026,
					},
				})).toEqual({
					resolvedReleaseAt:    Date.UTC(
						2026,
						0,
						1,
					),
					releaseDatePrecision: "year",
					releaseDateSource:    "media_start_date",
				});
			},
		);

		it(
			"falls back to provider release timestamps when no better provider timing exists",
			() => {
				expect(ReleaseDateResolver.resolve({ providerReleaseAt: 123_456 })).toEqual({
					resolvedReleaseAt:    123_456,
					releaseDatePrecision: "timestamp",
					releaseDateSource:    "provider_release_at",
				});
			},
		);

		it(
			"resolves missing dates to unknown and sorts them infinitely in the past for past/timeline views",
			() => {
				const releaseDate = ReleaseDateResolver.resolve({});

				expect(releaseDate).toEqual({
					resolvedReleaseAt:    null,
					releaseDatePrecision: "unknown",
					releaseDateSource:    "none",
				});
				expect(ReleaseDateResolver.getPastAndTimelineSortTimestamp(releaseDate)).toBe(Number.NEGATIVE_INFINITY);
				expect(ReleaseDateResolver.getUpcomingSortTimestamp(releaseDate)).toBeNull();
			},
		);

		it(
			"maps media DTO next-airing JSON and component start dates",
			() => {
				expect(ReleaseDateResolver.resolveMediaDto({
					nextAiringEpisodeJson: JSON.stringify({ airingAt: 1_800_000_001 }),
					startDateYear:         2026,
					startDateMonth:        4,
					startDateDay:          7,
				})).toEqual({
					resolvedReleaseAt:    1_800_000_001_000,
					releaseDatePrecision: "timestamp",
					releaseDateSource:    "next_airing_episode",
				});

				expect(ReleaseDateResolver.resolveMediaDto({
					nextAiringEpisodeJson: "{not-json",
					startDateYear:         2026,
					startDateMonth:        4,
					startDateDay:          7,
				})).toEqual({
					resolvedReleaseAt:    Date.UTC(
						2026,
						3,
						7,
					),
					releaseDatePrecision: "date",
					releaseDateSource:    "media_start_date",
				});
			},
		);
	},
);
