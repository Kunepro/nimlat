// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { parseKitsuAnimeXml } from "./external-tracking-kitsu-xml";

describe(
	"parseKitsuAnimeXml",
	() => {
		it(
			"imports completed XML state without treating a partial count as episode identities",
			() => {
				const items = parseKitsuAnimeXml(`<?xml version="1.0"?>
					<myanimelist>
						<anime>
							<series_animedb_id>1535</series_animedb_id>
							<series_episodes>37</series_episodes>
							<my_watched_episodes>37</my_watched_episodes>
							<my_finish_date>2026-07-18</my_finish_date>
							<my_status>Completed</my_status>
						</anime>
						<anime>
							<series_animedb_id>9253</series_animedb_id>
							<series_episodes>24</series_episodes>
							<my_watched_episodes>4</my_watched_episodes>
							<my_finish_date>0000-00-00</my_finish_date>
							<my_status>Watching</my_status>
						</anime>
					</myanimelist>`);

				expect(items).toEqual([
					expect.objectContaining({
						providerMediaId:     null,
						idMal:               1535,
						isWatched:           true,
						watchedEpisodeCount: 37,
						episodesCount:       37,
						watchedAt:           Date.parse("2026-07-18T00:00:00Z"),
					}),
					expect.objectContaining({
						providerMediaId:     null,
						idMal:               9253,
						isWatched:           false,
						watchedEpisodeCount: 0,
						episodesCount:       24,
						watchedAt:           null,
					}),
				]);
			},
		);

		it(
			"rejects unrelated or empty XML files",
			() => {
				expect(() => parseKitsuAnimeXml("<other/>")).toThrow(/not a Kitsu/u);
				expect(() => parseKitsuAnimeXml("<myanimelist/>")).toThrow(/does not contain/u);
			},
		);
	},
);
