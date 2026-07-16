import {
	buildDownloadSearchProviderUrl,
	buildDownloadSearchQuery,
} from "@nimlat/functions";
import {
	describe,
	expect,
	it,
} from "vitest";

describe(
	"download-search-query",
	() => {
		it(
			"builds a normalized query with duplicates removed",
			() => {
				expect(buildDownloadSearchQuery(
					"Full Metal Panic",
					[
						{ value: "1080p" },
						{ value: "1080p" },
						{ value: "dual audio" },
					],
					"BDRip dual",
				)).toBe("Full Metal Panic 1080p dual audio BDRip");
			},
		);

		it(
			"builds a provider URL using query placeholders",
			() => {
				expect(buildDownloadSearchProviderUrl(
					{ baseUrl: "https://example.test/search/{query}/1/" },
					"one piece 1080p",
				)).toBe("https://example.test/search/one%20piece%201080p/1/");
			},
		);

		it(
			"builds a provider URL by appending the query when no placeholder exists",
			() => {
				expect(buildDownloadSearchProviderUrl(
					{ baseUrl: "https://example.test/?q=" },
					"one piece",
				)).toBe("https://example.test/?q=one%20piece");
			},
		);

		it(
			"rejects empty provider queries",
			() => {
				expect(() => buildDownloadSearchProviderUrl(
					{ baseUrl: "https://example.test/?q=" },
					"   ",
				)).toThrow("Download search query cannot be empty.");
			},
		);

		it(
			"rejects non-HTTP provider URLs",
			() => {
				expect(() => buildDownloadSearchProviderUrl(
					{ baseUrl: "file:///tmp/{query}" },
					"test",
				)).toThrow("Download search provider URL must use HTTP or HTTPS.");
			},
		);
	},
);
