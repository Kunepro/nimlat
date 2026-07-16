// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createMediaInspectionData,
	formatMediaInspectionDateParts,
	type MediaInspectionEpisodeRow,
	type MediaInspectionMediaRow,
	normalizeEpisodeUpdatesQueueStatus,
	parseNextAiringEpisode,
	resolveMediaInspectionEpisodesCount,
	resolveMediaInspectionImageUrl,
	resolveSupportsMediaPlaybackIssueMoments,
} from "./media-inspection-model";

function createMediaRow(overrides: Partial<MediaInspectionMediaRow> = {}): MediaInspectionMediaRow {
	return {
		averageScore:                null,
		bannerImage:                 null,
		countryOfOrigin:             null,
		coverImageJson:              null,
		customImageUrl:              null,
		description:                 null,
		endDateDay:                  null,
		endDateMonth:                null,
		endDateYear:                 null,
		episodeUpdatesQueueStatus:   null,
		episodesCount:               null,
		format:                      null,
		hasAudioIssue:               0,
		hasDubIssue:                 0,
		hasEncodingIssue:            0,
		hasHydrationIssue:           0,
		hasSubIssue:                 0,
		hasVideoIssue:               0,
		idAniList:                   null,
		idMal:                       null,
		integrationPercent:          null,
		integrationStatus:           null,
		isAdult:                     0,
		isWatched:                   0,
		jikanEpisodesCoverageStatus: null,
		meanScore:                   null,
		mediaId:                     42,
		name:                        null,
		nameEnglish:                 null,
		nameJapanese:                null,
		nameRomanji:                 null,
		nextAiringEpisodeJson:       null,
		playbackIssueNote:           null,
		popularity:                  null,
		season:                      null,
		seasonYear:                  null,
		source:                      null,
		startDateDay:                null,
		startDateMonth:              null,
		startDateYear:               null,
		status:                      null,
		...overrides,
	};
}

function createEpisodeRow(overrides: Partial<MediaInspectionEpisodeRow> = {}): MediaInspectionEpisodeRow {
	return {
		aired:              null,
		description:        null,
		duration:           null,
		episodeNumber:      1,
		filler:             0,
		hasAudioIssue:      0,
		hasDubIssue:        0,
		hasEncodingIssue:   0,
		hasSubIssue:        0,
		hasVideoIssue:      0,
		integrationPercent: null,
		integrationStatus:  null,
		isWatched:          0,
		mediaId:            42,
		name:               null,
		playbackIssueNote:  null,
		score:              null,
		synopsis:           null,
		thumbnail:          null,
		...overrides,
	};
}

describe(
	"resolveMediaInspectionEpisodesCount",
	() => {
		it(
			"uses hydrated rows when the catalog count is still unknown",
			() => {
				expect(resolveMediaInspectionEpisodesCount(
					null,
					1120,
				)).toBe(1120);
			},
		);

		it(
			"keeps the larger count when hydrated rows exceed a stale catalog count",
			() => {
				expect(resolveMediaInspectionEpisodesCount(
					12,
					13,
				)).toBe(13);
			},
		);

		it(
			"preserves zero when no episode rows exist",
			() => {
				expect(resolveMediaInspectionEpisodesCount(
					0,
					0,
				)).toBe(0);
				expect(resolveMediaInspectionEpisodesCount(
					null,
					0,
				)).toBeUndefined();
			},
		);

		it(
			"keeps the catalog count after Jikan successfully syncs an empty episode snapshot",
			() => {
				expect(resolveMediaInspectionEpisodesCount(
					1,
					0,
				)).toBe(1);
			},
		);
	},
);

describe(
	"media inspection primitive mappers",
	() => {
		it(
			"resolves image, date, next-airing, and queue-status fallbacks",
			() => {
				expect(resolveMediaInspectionImageUrl(
					"custom.jpg",
					"{\"large\":\"cover.jpg\"}",
					"banner.jpg",
				)).toBe("custom.jpg");
				expect(resolveMediaInspectionImageUrl(
					null,
					"{\"medium\":\"cover.jpg\"}",
					"banner.jpg",
				)).toBe("cover.jpg");
				expect(resolveMediaInspectionImageUrl(
					null,
					"{broken",
					"banner.jpg",
				)).toBe("banner.jpg");
				expect(formatMediaInspectionDateParts(
					2026,
					7,
					null,
				)).toBe("2026-07");
				expect(parseNextAiringEpisode("{\"episode\":4,\"airingAt\":1800000000,\"timeUntilAiring\":3600}")).toEqual({
					airingAt:        1800000000,
					episode:         4,
					timeUntilAiring: 3600,
				});
				expect(parseNextAiringEpisode("{\"episode\":\"bad\",\"airingAt\":1800000000}")).toBeUndefined();
				expect(normalizeEpisodeUpdatesQueueStatus("processing")).toBe("processing");
				expect(normalizeEpisodeUpdatesQueueStatus("done")).toBeUndefined();
			},
		);
	},
);

describe(
	"resolveSupportsMediaPlaybackIssueMoments",
	() => {
		it(
			"allows media-level timestamps for movies",
			() => {
				expect(resolveSupportsMediaPlaybackIssueMoments(
					"MOVIE",
					null,
				)).toBe(true);
			},
		);

		it(
			"allows media-level timestamps for Jikan-empty non-movie entries",
			() => {
				expect(resolveSupportsMediaPlaybackIssueMoments(
					"SPECIAL",
					"empty",
				)).toBe(true);
			},
		);

		it(
			"keeps normal episodic media timestamps on child episodes",
			() => {
				expect(resolveSupportsMediaPlaybackIssueMoments(
					"TV",
					"available",
				)).toBe(false);
			},
		);
	},
);

describe(
	"createMediaInspectionData",
	() => {
		it(
			"maps DB rows into the renderer-facing inspection payload",
			() => {
				const inspection = createMediaInspectionData({
					episodeRows:                  [
						createEpisodeRow({
							aired:              "2026-01-01",
							description:        "Episode override",
							duration:           1440,
							episodeNumber:      3,
							filler:             1,
							hasAudioIssue:      1,
							integrationPercent: 75,
							integrationStatus:  "downloaded",
							isWatched:          1,
							name:               "Episode Three",
							playbackIssueNote:  "Audio dips",
							score:              8.3,
							synopsis:           "Recap text",
						}),
					],
					genreRows:                    [
						{ name: "Action" },
						{ name: "" },
					],
					hydratedEpisodesCount:        3,
					media:                        createMediaRow({
						bannerImage:                 "banner.jpg",
						coverImageJson:              "{\"large\":\"cover.jpg\"}",
						episodeUpdatesQueueStatus:   "failed",
						episodesCount:               2,
						format:                      "SPECIAL",
						hasHydrationIssue:           1,
						idAniList:                   1_000,
						integrationStatus:           "tracked",
						isAdult:                     1,
						isWatched:                   1,
						jikanEpisodesCoverageStatus: "empty",
						mediaId:                     42,
						name:                        "Inspection Title",
						nameEnglish:                 "English Title",
						nameJapanese:                "Native Title",
						nameRomanji:                 "Romaji Title",
						nextAiringEpisodeJson:       "{\"episode\":4,\"airingAt\":1800000000}",
						startDateMonth:              7,
						startDateYear:               2026,
					}),
					mediaPlaybackIssueMomentRows: [
						{
							note:                  "Opening glitch",
							playbackIssueCategory: "video",
							timeSeconds:           12,
						},
					],
					playbackIssueMomentRows:      [
						{
							episodeNumber:         3,
							note:                  "Dub mismatch",
							playbackIssueCategory: "dub",
							timeSeconds:           84,
						},
					],
					tagRows:                      [
						{
							category: "Theme",
							name:     "Found Family",
							rank:     80,
						},
						{
							category: null,
							name:     null,
							rank:     null,
						},
					],
				});

				expect(inspection).toMatchObject({
					episodeUpdatesQueueStatus:         "failed",
					episodesCount:                     3,
					genres:                            [ "Action" ],
					hasHydrationIssue:                 true,
					idAniList:                         1_000,
					imageUrl:                          "cover.jpg",
					integrationStatus:                 "tracked",
					isAdult:                           true,
					isFilm:                            false,
					isWatched:                         true,
					jikanEpisodesCoverageStatus:       "empty",
					mediaId:                           42,
					name:                              "Inspection Title",
					nextAiringEpisode:                 {
						airingAt: 1800000000,
						episode:  4,
					},
					playbackIssueMoments:              [
						{
							note:                  "Opening glitch",
							playbackIssueCategory: "video",
							timeSeconds:           12,
						},
					],
					startDate:                         "2026-07",
					supportsMediaPlaybackIssueMoments: true,
					tags:                              [
						{
							category: "Theme",
							name:     "Found Family",
							rank:     80,
						},
					],
					titleOptions:                      {
						english: "English Title",
						native:  "Native Title",
						romaji:  "Romaji Title",
					},
				});
				expect(inspection.episodes).toEqual([
					{
						aired:                "2026-01-01",
						description:          "Episode override",
						duration:             1440,
						episodeNumber:        3,
						filler:               true,
						hasAudioIssue:        true,
						hasDubIssue:          false,
						hasEncodingIssue:     false,
						hasSubIssue:          false,
						hasVideoIssue:        false,
						integrationPercent:   75,
						integrationStatus:    "downloaded",
						isWatched:            true,
						mediaId:              42,
						name:                 "Episode Three",
						playbackIssueMoments: [
							{
								note:                  "Dub mismatch",
								playbackIssueCategory: "dub",
								timeSeconds:           84,
							},
						],
						playbackIssueNote:    "Audio dips",
						recap:                "Recap text",
						score:                8.3,
						thumbnail:            undefined,
					},
				]);
			},
		);
	},
);
