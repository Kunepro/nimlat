import {
	describe,
	expect,
	it,
} from "vitest";
import { JikanMalformedPayloadError } from "./jikan-errors";
import {
	toJikanEpisodeDetailsResponse,
	toJikanEpisodesResponse,
	toJikanEpisodeVideosResponse,
} from "./jikan-response-normalizer";

const context = {
	endpoint: "episodes" as const,
	malId:    123,
	page:     2,
	status:   200,
	details:  {
		url:        "https://api.jikan.moe/v4/anime/123/episodes?page=2",
		statusText: "OK",
		retryAfter: null,
		headers:    {},
		body:       "{\"data\":[]}",
	},
};

describe(
	"jikan response normalizer",
	() => {
		it(
			"normalizes paginated episode payloads",
			() => {
				expect(toJikanEpisodesResponse(
					{
						pagination: {
							last_visible_page: 4,
							has_next_page:     true,
						},
						data:       [
							{
								mal_id: 1,
								title:  "Pilot",
							},
						],
					},
					context,
				)).toEqual({
					pagination: {
						last_visible_page: 4,
						has_next_page:     true,
					},
					data:       [
						{
							mal_id: 1,
							title:  "Pilot",
						},
					],
				});
			},
		);

		it(
			"defaults missing pagination while requiring a data array",
			() => {
				expect(toJikanEpisodeVideosResponse(
					{ data: [] },
					{
						...context,
						endpoint: "episode-videos",
					},
				)).toEqual({
					pagination: {
						last_visible_page: 2,
						has_next_page:     false,
					},
					data:       [],
				});
			},
		);

		it(
			"throws a structured malformed payload error when data is missing",
			() => {
				expect(() => toJikanEpisodesResponse(
					{ pagination: {} },
					context,
				)).toThrow(JikanMalformedPayloadError);
			},
		);

		it(
			"normalizes episode details payloads",
			() => {
				expect(toJikanEpisodeDetailsResponse(
					{
						data: {
							mal_id: 5,
							title:  "A detail",
						},
					},
					{
						...context,
						endpoint: "episode-details",
						page:     5,
					},
				)).toEqual({
					data: {
						mal_id: 5,
						title:  "A detail",
					},
				});
			},
		);
	},
);
