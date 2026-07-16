// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	validateDownloadSearchKeywordPresetRequest,
	validateDownloadSearchProviderRequest,
	validateDownloadSearchQueryPresetRequest,
} from "./download-search-provider-validation";

describe(
	"download-search-provider-validation",
	() => {
		it(
			"trims provider labels and URL templates before persistence",
			() => {
				expect(validateDownloadSearchProviderRequest({
					label:    "  Nyaa  ",
					category: "torrent",
					baseUrl:  "  https://example.test/search?q={query}  ",
				})).toEqual({
					label:    "Nyaa",
					category: "torrent",
					baseUrl:  "https://example.test/search?q={query}",
				});
			},
		);

		it(
			"preserves update metadata while normalizing provider input",
			() => {
				expect(validateDownloadSearchProviderRequest({
					providerId: "provider-1",
					label:      "  Index  ",
					category:   "index",
					baseUrl:    "  https://example.test/?q={query}  ",
				})).toEqual({
					providerId: "provider-1",
					label:      "Index",
					category:   "index",
					baseUrl:    "https://example.test/?q={query}",
				});
			},
		);

		it(
			"rejects provider URL templates that cannot produce a single HTTP search URL",
			() => {
				expect(() => validateDownloadSearchProviderRequest({
					label:    "Broken",
					category: "torrent",
					baseUrl:  "https://example.test/{query}/{query}",
				})).toThrow("can include {query} at most once");

				expect(() => validateDownloadSearchProviderRequest({
					label:    "Local",
					category: "torrent",
					baseUrl:  "file:///tmp/{query}",
				})).toThrow("not a valid HTTP or HTTPS URL");
			},
		);

		it(
			"rejects empty custom preset names or values",
			() => {
				expect(() => validateDownloadSearchKeywordPresetRequest({
					label:    " ",
					value:    "1080p",
					category: "quality",
				})).toThrow("requires a label and value");
				expect(() => validateDownloadSearchKeywordPresetRequest({
					label:    "1080p",
					value:    " ",
					category: "quality",
				})).toThrow("requires a label and value");
			},
		);

		it(
			"rejects empty query preset names",
			() => {
				expect(() => validateDownloadSearchQueryPresetRequest({
					label:             " ",
					selectedPresetIds: [],
					customQueryText:   "batch",
				})).toThrow("requires a name");
			},
		);
	},
);
