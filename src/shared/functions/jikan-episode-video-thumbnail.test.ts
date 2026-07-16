import {
	isMalBannedYoutubeThumbnailUrl,
	normalizeJikanEpisodeVideoThumbnailUrl,
	resolveJikanEpisodeVideoEpisodeNumber,
} from "@nimlat/functions";
import {
	describe,
	expect,
	it,
} from "vitest";

describe(
	"Jikan episode-video thumbnail normalization",
	() => {
		it(
			"treats MAL banned YouTube icons as unusable thumbnails",
			() => {
				expect(isMalBannedYoutubeThumbnailUrl("https://myanimelist.net/images/icon-banned-youtube.png")).toBe(true);
				expect(normalizeJikanEpisodeVideoThumbnailUrl("https://myanimelist.net/images/icon-banned-youtube.png")).toBeNull();
			},
		);

		it(
			"preserves real thumbnail URLs and ignores missing values",
			() => {
				expect(normalizeJikanEpisodeVideoThumbnailUrl(" https://img.example.test/episode.jpg ")).toBe("https://img.example.test/episode.jpg");
				expect(normalizeJikanEpisodeVideoThumbnailUrl(null)).toBeUndefined();
				expect(normalizeJikanEpisodeVideoThumbnailUrl("")).toBeUndefined();
			},
		);

		it(
			"resolves episode numbers only from explicit episode labels or MAL episode URLs",
			() => {
				expect(resolveJikanEpisodeVideoEpisodeNumber({
					mal_id:  812345,
					episode: "Episode 1037",
				})).toBe(1037);
				expect(resolveJikanEpisodeVideoEpisodeNumber({
					mal_id: 812345,
					url:    "https://myanimelist.net/anime/21/One_Piece/episode/3",
				})).toBe(3);
				expect(resolveJikanEpisodeVideoEpisodeNumber({
					mal_id: 812345,
					episode: "12: A quiet title",
				})).toBe(12);
			},
		);

		it(
			"does not trust ambiguous episode-video mal_id values as episode numbers",
			() => {
				expect(resolveJikanEpisodeVideoEpisodeNumber({
					mal_id: 3,
					title:  "Future arc preview with unrelated thumbnail",
				})).toBeUndefined();
			},
		);
	},
);
