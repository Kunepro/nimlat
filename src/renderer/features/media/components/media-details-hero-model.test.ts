import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildMediaHeroDetailGroups,
	formatMediaHeroEpisodeListStatus,
	formatMediaHeroEpisodesField,
	formatMediaHeroNextAiring,
	resolveMediaHeroIgnorePresentation,
	resolveMediaHeroWatchedLabel,
	selectMediaHeroBannerImageUrl,
	selectMediaHeroImageUrl,
} from "./media-details-hero-model";

function createMedia(overrides: Partial<MediaInspectionData> = {}): MediaInspectionData {
	return {
		mediaId:                           42,
		name:                              "Cowboy Bebop",
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [],
		...overrides,
	};
}

describe(
	"media-details-hero-model",
	() => {
		it(
			"resolves image priority and watched action label",
			() => {
				expect(selectMediaHeroImageUrl(createMedia({
					imageUrl:                "fallback.jpg",
					displayImageUrl:         "display.jpg",
					displayImageFullSizeUrl: "full.jpg",
				}))).toBe("full.jpg");
				expect(selectMediaHeroImageUrl(createMedia({
					imageUrl:        "fallback.jpg",
					displayImageUrl: "display.jpg",
				}))).toBe("display.jpg");
				expect(selectMediaHeroBannerImageUrl(createMedia({
					bannerImage:           "banner.jpg",
					displayBannerImageUrl: "display-banner.jpg",
				}))).toBe("display-banner.jpg");
				expect(selectMediaHeroBannerImageUrl(createMedia({
					bannerImage: "banner.jpg",
				}))).toBe("banner.jpg");
				expect(resolveMediaHeroWatchedLabel(true)).toBe("Watched");
				expect(resolveMediaHeroWatchedLabel(false)).toBe("Mark watched");
			},
		);

		it(
			"derives ignore action state from integration status and pending writes",
			() => {
				expect(resolveMediaHeroIgnorePresentation(
					"ignored",
					true,
				)).toEqual({
					ariaLabel:    "Media already ignored",
					isDisabled:   true,
					isLoading:    false,
					tooltipTitle: "Media already ignored",
				});
				expect(resolveMediaHeroIgnorePresentation(
					"downloaded",
					true,
				)).toEqual({
					ariaLabel:    "Ignore media",
					isDisabled:   true,
					isLoading:    true,
					tooltipTitle: "Ignore media",
				});
			},
		);

		it(
			"formats episode and next-airing facts",
			() => {
				expect(formatMediaHeroEpisodesField(createMedia({
					episodesCount:               1,
					jikanEpisodesCoverageStatus: "empty",
				}))).toBe("Single episode");
				expect(formatMediaHeroEpisodesField(createMedia({
					episodesCount:               1,
					jikanEpisodesCoverageStatus: "available",
				}))).toBe("Single episode");
				expect(formatMediaHeroEpisodesField(createMedia({
					episodesCount:               4,
					jikanEpisodesCoverageStatus: "empty",
				}))).toBe("4");
				expect(formatMediaHeroEpisodesField(createMedia())).toBe("Episode list still loading");
				expect(formatMediaHeroEpisodeListStatus(createMedia({
					jikanEpisodesCoverageStatus: "available",
				}))).toBe("Complete");
				expect(formatMediaHeroEpisodeListStatus(createMedia({
					jikanEpisodesCoverageStatus: "empty",
				}))).toBe("Unavailable");
				expect(formatMediaHeroEpisodeListStatus(createMedia({
					episodeUpdatesQueueStatus:   "pending",
					jikanEpisodesCoverageStatus: "available",
				}))).toBe("Pending");
				expect(formatMediaHeroEpisodeListStatus(createMedia({
					episodeUpdatesQueueStatus:   "processing",
					jikanEpisodesCoverageStatus: "available",
				}))).toBe("Processing");
				expect(formatMediaHeroEpisodeListStatus(createMedia({
					episodeUpdatesQueueStatus:   "failed",
					jikanEpisodesCoverageStatus: "available",
				}))).toBe("Failed");
				expect(formatMediaHeroEpisodeListStatus(createMedia())).toBe("Pending");

				const airingAt      = 1_700_000_000;
				const formattedDate = new Intl.DateTimeFormat(
					undefined,
					{
						dateStyle: "medium",
						timeStyle: "short",
					},
				).format(new Date(airingAt * 1000));
				expect(formatMediaHeroNextAiring({
					airingAt,
					episode: 3,
				})).toBe(`Episode 3 - ${ formattedDate }`);
				expect(formatMediaHeroNextAiring({
					airingAt: Number.NaN,
					episode:  4,
				})).toBe("Episode 4");
			},
		);

		it(
			"builds non-empty detail groups from media inspection data",
			() => {
				expect(buildMediaHeroDetailGroups(createMedia({
					format:          "TV",
					status:          "FINISHED",
					episodesCount:   26,
					jikanEpisodesCoverageStatus: "available",
					isAdult:         true,
					startDate:       "1998-04-03",
					season:          "SPRING",
					seasonYear:      1998,
					averageScore:    86,
					meanScore:       84,
					popularity:      123_456,
					source:          "ORIGINAL",
					countryOfOrigin: "JP",
					idAniList:                   1_000,
					idMal:                       2_000,
					titleOptions:                {
						english: "Cowboy Bebop",
						romaji:  "Kauboi Bibappu",
						native:  "Cowboy Bebop Native",
					},
				}))).toEqual([
					{
						title: "Titles",
						facts: [
							{
								label: "Romaji",
								value: "Kauboi Bibappu",
							},
							{
								label: "Native",
								value: "Cowboy Bebop Native",
							},
						],
					},
					{
						title: "Links",
						facts: [
							{
								ariaLabel: "Open AniList page",
								href:      "https://anilist.co/anime/1000",
								label:     "AniList",
								value:     "#1000",
							},
							{
								ariaLabel: "Open MAL page",
								href:      "https://myanimelist.net/anime/2000",
								label:     "MAL",
								value:     "#2000",
							},
						],
					},
					{
						title: "Media",
						facts: [
							{
								label: "Format",
								value: "TV",
							},
							{
								label: "Status",
								value: "FINISHED",
							},
							{
								label: "Episodes",
								value: "26",
							},
							{
								label: "Episode list",
								value: "Complete",
							},
							{
								label: "Rating",
								value: "18+",
							},
						],
					},
					{
						title: "Release",
						facts: [
							{
								label: "Start",
								value: "1998-04-03",
							},
							{
								label: "Season",
								value: "SPRING 1998",
							},
						],
					},
					{
						title: "Scores",
						facts: [
							{
								label: "Average",
								value: "86%",
							},
							{
								label: "Mean",
								value: "84%",
							},
							{
								label: "Popularity",
								value: new Intl.NumberFormat().format(123_456),
							},
						],
					},
					{
						title: "Origin",
						facts: [
							{
								label: "Source",
								value: "ORIGINAL",
							},
							{
								label: "Country",
								value: "JP",
							},
						],
					},
				]);
			},
		);
	},
);
