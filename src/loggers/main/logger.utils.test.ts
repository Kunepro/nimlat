// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const generateLogFileName = vi.fn();
const writeMainLogFile    = vi.fn();
const writeErrorLogFile = vi.fn();

vi.mock(
	"./utils/generate-log-file-name",
	() => ({
		generateLogFileName,
	}),
);

vi.mock(
	"./utils/write-main-log-file",
	() => ({
		writeMainLogFile,
	}),
);

vi.mock(
	"./utils/write-error-log-file",
	() => ({
		writeErrorLogFile,
	}),
);

describe(
	"LoggerUtils debug-gated operational logs",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			generateLogFileName.mockReturnValue("C:/logs/debug.log");
		});

		it(
			"does not emit debug-gated info or warning logs when debugging is disabled",
			async () => {
				const { LoggerUtils } = await import("./logger.utils");
				LoggerUtils.setDebugLoggingEnabledResolver(() => false);

				expect(LoggerUtils.logMainInfo(
					"context.info",
					"message",
				)).toBe("");
				expect(LoggerUtils.logMainWarning(
					"context.warning",
					"message",
				)).toBe("");

				expect(generateLogFileName).not.toHaveBeenCalled();
				expect(writeMainLogFile).not.toHaveBeenCalled();
			},
		);

		it(
			"writes debug-gated info logs to file and console through the shared helper",
			async () => {
				const { LoggerUtils } = await import("./logger.utils");
				LoggerUtils.setDebugLoggingEnabledResolver(() => true);

				const details = {
					queue: "characters",
					count: 2,
				};
				const log     = LoggerUtils.logMainInfo(
					"context.info",
					"Hydration started.",
					details,
				);

				expect(generateLogFileName).toHaveBeenCalledWith(
					"main-info",
					expect.any(Number),
				);
				expect(writeMainLogFile).toHaveBeenCalledWith(
					log,
					"C:/logs/debug.log",
					"info",
					details,
				);
			},
		);

		it(
			"writes debug-gated warning logs to file and console through the shared helper",
			async () => {
				const { LoggerUtils } = await import("./logger.utils");
				LoggerUtils.setDebugLoggingEnabledResolver(() => true);

				const details = { startPage: 4 };
				const log     = LoggerUtils.logMainWarning(
					"context.warning",
					"Deprecated option used.",
					details,
				);

				expect(generateLogFileName).toHaveBeenCalledWith(
					"main-warning",
					expect.any(Number),
				);
				expect(writeMainLogFile).toHaveBeenCalledWith(
					log,
					"C:/logs/debug.log",
					"warning",
					details,
				);
			},
		);
	},
);

describe(
	"LoggerUtils error logs",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			generateLogFileName.mockReturnValue("C:/logs/error.log");
		});

		it(
			"enriches service errors with upstream response details",
			async () => {
				const { LoggerUtils } = await import("./logger.utils");
				const error           = Object.assign(
					new Error("Provider failed"),
					{
						response: {
							status:     429,
							statusText: "Too Many Requests",
							headers:    {
								"retry-after": "30",
							},
							data:       {
								reason: "rate-limit",
							},
						},
						request:  {
							variables: {
								id: 123,
							},
						},
					},
				);

				const log = LoggerUtils.logMainServiceError(
					"api.provider.fetch",
					error,
					{ mediaId: 123 },
				);

				expect(log).toContain("[main-service-error]");
				expect(log).toContain("detail.mediaId: 123");
				expect(log).toContain("detail.upstreamStatus: 429");
				expect(log).toContain("detail.upstreamRetryAfter: 30");
				expect(log).toContain("detail.upstreamResponseData: {\"reason\":\"rate-limit\"}");
				expect(log).toContain("detail.upstreamRequestVariables: {\"id\":123}");
				expect(writeErrorLogFile).toHaveBeenCalledWith(
					log,
					"C:/logs/error.log",
					error,
				);
			},
		);

		it(
			"keeps AniList rate limiter context and upstream details in one error log",
			async () => {
				const { LoggerUtils } = await import("./logger.utils");
				const error           = Object.assign(
					new Error("AniList failed"),
					{
						status:   500,
						endpoint: "https://graphql.anilist.co",
					},
				);

				const log = LoggerUtils.logAniListRateLimiterError(
					error,
					{
						message:                  "AniList request failed.",
						priority:                 "manual",
						queueSizeManual:          1,
						queueSizeSeriesHydration: 2,
						requestAgeMs:             100,
						operation:                "media-by-id",
						idAniList:                123,
						sort:                     [ "ID" ],
					},
				);

				expect(log).toContain("=== AniList Rate Limiter Error ===");
				expect(log).toContain("Priority: manual");
				expect(log).toContain("QueueManual: 1");
				expect(log).toContain("QueueSeriesHydration: 2");
				expect(log).toContain("RequestAgeMs: 100");
				expect(log).toContain("Operation: media-by-id");
				expect(log).toContain("AniListId: 123");
				expect(log).toContain("Sort: [\"ID\"]");
				expect(log).toContain("upstreamStatus: 500");
				expect(log).toContain("upstreamEndpoint: https://graphql.anilist.co");
				expect(writeErrorLogFile).toHaveBeenCalledWith(
					log,
					"C:/logs/error.log",
					error,
				);
			},
		);
	},
);
