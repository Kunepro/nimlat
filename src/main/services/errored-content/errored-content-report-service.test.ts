// @vitest-environment node
import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const logger = {
	logMainServiceError: vi.fn(),
	logMainWarning:      vi.fn(),
};

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: logger,
	}),
);

const baseItem: ErroredContentItem = {
	queue:              "jikan-episodes",
	mediaId:            123,
	name:               "Test Media With A Reasonable Title",
	format:             "TV",
	status:             "RELEASING",
	idAniList:          456,
	idMal:              789,
	errorMessage:       "Jikan failed at https://api.jikan.moe/v4/anime/789/episodes because AniList source URL https://graphql.anilist.co and MAL were unavailable",
	failureReason:      "transient_failure",
	queueStatus:        "failed",
	retryCount:         3,
	lastTriedAt:        1000,
	nextAutoRetryAt:    null,
	isHidden:           false,
	hiddenAt:           null,
	canOpenMedia:       true,
	canRetry:           true,
	isAutoRetryPlanned: false,
	isRetryExhausted:   true,
	recommendedAction:  "report",
	fingerprint:        "NIMLAT-ERR-ABC123DEF456",
};

describe(
	"errored-content-report-service",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.unstubAllGlobals();
		});

		it(
			"reuses an existing GitHub issue when the fingerprint is already indexed",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn().mockResolvedValue({
						ok:   true,
						json: vi.fn().mockResolvedValue({
							items: [
								{ html_url: "https://github.com/Kunepro/nimlat/issues/10" },
							],
						}),
					}),
				);
				const { resolveErroredContentReportUrl } = await import("./errored-content-report-service");

				const reportUrl = await resolveErroredContentReportUrl(baseItem);

				expect(reportUrl).toBe("https://github.com/Kunepro/nimlat/issues/10");
				expect(fetch).toHaveBeenCalledOnce();
			},
		);

		it(
			"builds a sanitized new issue URL when GitHub search cannot find a match",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn().mockRejectedValue(new Error("network unavailable")),
				);
				const { resolveErroredContentReportUrl } = await import("./errored-content-report-service");

				const reportUrl = await resolveErroredContentReportUrl(baseItem);
				const url       = new URL(reportUrl);
				const body      = url.searchParams.get("body") ?? "";

				expect(url.origin + url.pathname).toBe("https://github.com/Kunepro/nimlat/issues/new");
				expect(body).toContain("NIMLAT-ERR-ABC123DEF456");
				expect(body).toContain("[source URL hidden]");
				expect(body).toContain("catalog data source URL");
				expect(body).toContain("episode metadata failed");
				expect(body).not.toContain("https://api.jikan.moe");
				expect(body).not.toContain("https://graphql.anilist.co");
				expect(body).not.toContain("AniList");
				expect(body).not.toContain("Jikan");
				expect(body).not.toContain("MAL");
				expect(logger.logMainWarning).toHaveBeenCalledWith(
					"errored-content.github-issue-search",
					"GitHub issue search could not be completed.",
					expect.objectContaining({
						fingerprint: "NIMLAT-ERR-ABC123DEF456",
					}),
				);
			},
		);
	},
);
