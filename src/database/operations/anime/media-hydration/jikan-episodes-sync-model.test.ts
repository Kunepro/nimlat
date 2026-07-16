// @vitest-environment node
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "@nimlat/types/jikan-api";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createInitialJikanEpisodesSyncStateRow,
	createJikanEpisodesSyncRunId,
	isJikanEpisodeThumbnailWriteCompatibleWithEpisode,
	toEpisodesProgressStateRow,
	toJikanEpisodesCoverageStatus,
	toJikanEpisodesSyncStateDto,
	toJikanEpisodeStagingWriteRows,
	toJikanEpisodeThumbnailWrites,
	toSynopsisProgressStateRow,
} from "./jikan-episodes-sync-model";

function createJikanEpisode(overrides: Partial<JikanEpisode> = {}): JikanEpisode {
	return {
		mal_id:         3,
		url:            "https://example.test/episode/3",
		title:          "Episode Three",
		title_japanese: null,
		title_romanji:  "Episode Three",
		synopsis:       "Synopsis",
		duration:       1440,
		aired:          "2026-01-03T00:00:00+00:00",
		score:          8.2,
		filler:         false,
		recap:          true,
		forum_url:      null,
		...overrides,
	};
}

function createJikanVideo(overrides: Partial<JikanEpisodeVideo> = {}): JikanEpisodeVideo {
	return {
		mal_id:  99_001,
		episode: "Episode 3",
		title:   "Preview",
		url:     "https://myanimelist.net/anime/1/example/episode/3",
		images:  {
			jpg: {
				image_url: " https://cdn.example.test/episode-3.jpg ",
			},
		},
		...overrides,
	};
}

describe(
	"jikan episodes sync model",
	() => {
		it(
			"creates initial sync state and maps legacy DB columns to DTO fields",
			() => {
				const syncRunId = createJikanEpisodesSyncRunId(
					42,
					1_700_000,
				);
				const row       = createInitialJikanEpisodesSyncStateRow(
					42,
					syncRunId,
					1_700_000,
				);

				expect(syncRunId).toBe("1700000-42");
				expect(row).toMatchObject({
					phase:               "episodes",
					lastEpisodesPage:    0,
					hasNextEpisodesPage: 1,
					lastVideosPage:      0,
					hasNextVideosPage:   1,
				});
				expect(toJikanEpisodesSyncStateDto(row)).toMatchObject({
					mediaId:                   42,
					syncRunId,
					phase:                     "episodes",
					hasNextEpisodesPage:       true,
					lastSynopsisEpisodeNumber: 0,
					hasNextSynopsisEpisode:    true,
				});
			},
		);

		it(
			"advances episode and synopsis phases without mutating prior state",
			() => {
				const initial       = createInitialJikanEpisodesSyncStateRow(
					42,
					"run-42",
					100,
				);
				const afterEpisodes = toEpisodesProgressStateRow(
					initial,
					5,
					false,
					200,
				);
				const afterSynopsis = toSynopsisProgressStateRow(
					afterEpisodes,
					12,
					false,
					300,
				);

				expect(initial.phase).toBe("episodes");
				expect(afterEpisodes).toMatchObject({
					phase:               "synopses",
					lastEpisodesPage:    5,
					hasNextEpisodesPage: 0,
					updatedAt:           200,
				});
				expect(afterSynopsis).toMatchObject({
					phase:             "finalize",
					lastVideosPage:    12,
					hasNextVideosPage: 0,
					updatedAt:         300,
				});
			},
		);

		it(
			"maps Jikan episodes into staging rows with DB-safe nullable fields",
			() => {
				expect(toJikanEpisodeStagingWriteRows(
					42,
					"run-42",
					[
						createJikanEpisode({
							title:    "",
							synopsis: undefined,
							duration: undefined,
							filler:   true,
						}),
					],
				)).toEqual([
					{
						mediaId:       42,
						syncRunId:     "run-42",
						episodeNumber: 3,
						url:           "https://example.test/episode/3",
						name:          null,
						nameJapanese:  null,
						nameRomanji:   "Episode Three",
						synopsis:      null,
						duration:      null,
						aired:         "2026-01-03T00:00:00+00:00",
						score:         8.2,
						filler:        1,
						recap:         1,
						thumbnail:     null,
					},
				]);
			},
		);

		it(
			"keeps only safe episode thumbnail writes",
			() => {
				const writes = toJikanEpisodeThumbnailWrites([
					createJikanVideo(),
					createJikanVideo({
						episode: "Trailer",
						url:     "https://example.test/no-episode",
					}),
					createJikanVideo({
						images: {
							jpg: {
								image_url: "https://myanimelist.net/images/icon-banned-youtube.png",
							},
						},
					}),
				]);

				expect(writes).toEqual([
					{
						episodeNumber: 3,
						thumbnail:     "https://cdn.example.test/episode-3.jpg",
						title: "Preview",
					},
					{
						episodeNumber: 3,
						thumbnail:     null,
						title: "Preview",
					},
				]);
			},
		);

		it(
			"rejects episode-video thumbnails when the provider title does not match the canonical episode title",
			() => {
				expect(isJikanEpisodeThumbnailWriteCompatibleWithEpisode(
					{
						episodeNumber: 1,
						thumbnail:     "https://img1.ak.crunchyroll.com/i/spire4-tmb/wano-arc.jpg",
						title:         "A State of Emergency! Big Mom Closes in!",
					},
					{
						episodeNumber: 1,
						name:          "I'm Luffy! The Man Who's Gonna Be King of the Pirates!",
						nameJapanese:  null,
						nameRomanji:   null,
					},
				)).toBe(false);
				expect(isJikanEpisodeThumbnailWriteCompatibleWithEpisode(
					{
						episodeNumber: 1123,
						thumbnail:     "https://img1.ak.crunchyroll.com/i/spire4-tmb/current-arc.jpg",
						title:         "Episode 1123 - The World Shakes! The Straw Hats' Hostage Situation",
					},
					{
						episodeNumber: 1123,
						name:          "The World Shakes! The Straw Hats' Hostage Situation",
						nameJapanese:  null,
						nameRomanji:   null,
					},
				)).toBe(true);
			},
		);

		it(
			"reports empty successful provider snapshots separately from available snapshots",
			() => {
				expect(toJikanEpisodesCoverageStatus(0)).toBe("empty");
				expect(toJikanEpisodesCoverageStatus(3)).toBe("available");
			},
		);
	},
);
