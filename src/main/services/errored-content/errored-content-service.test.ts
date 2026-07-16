// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const facade = {
	getErroredContent:      vi.fn(),
	hideErroredContent:     vi.fn(),
	listErroredContent:     vi.fn(),
	retryAllErroredContent: vi.fn(),
	retryErroredContent:    vi.fn(),
};

const bus = {
	next: vi.fn(),
};

const logger = {
	logMainServiceError: vi.fn(),
};

const shell = {
	openExternal: vi.fn(),
};

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: facade,
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_HydratorQueueChanges: bus,
	}),
);

vi.mock(
	"electron",
	() => ({
		shell,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: logger,
	}),
);

describe(
	"errored-content-service",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			vi.unstubAllGlobals();
			facade.listErroredContent.mockReturnValue({
				items:      [],
				nextOffset: null,
				total:      0,
			});
			facade.getErroredContent.mockReturnValue({
				queue:             "jikan-episodes",
				mediaId:           123,
				name:              "Test Media",
				format:            "TV",
				status:            "RELEASING",
				idAniList:         456,
				idMal:             789,
				errorMessage:      "Jikan failed with 404",
				failureReason:     "transient_failure",
				queueStatus:        "failed",
				retryCount:        3,
				lastTriedAt:       1000,
				nextAutoRetryAt:    null,
				isHidden:           false,
				hiddenAt:           null,
				canOpenMedia:      true,
				canRetry:          true,
				isAutoRetryPlanned: false,
				isRetryExhausted:  true,
				recommendedAction: "report",
				fingerprint:       "NIMLAT-ERR-ABC123DEF456",
			});
			facade.retryErroredContent.mockReturnValue(true);
			facade.hideErroredContent.mockReturnValue(true);
			shell.openExternal.mockResolvedValue(undefined);
		});

		it(
			"clamps list pagination before reading failed queue items",
			async () => {
				const { listErroredContent } = await import("./errored-content-service");

				listErroredContent(
					-10,
					500,
					"characters",
				);

				expect(facade.listErroredContent).toHaveBeenCalledWith(
					0,
					100,
					"characters",
					false,
				);
			},
		);

		it(
			"emits a queue change after a failed item is moved back to pending",
			async () => {
				const { retryErroredContent } = await import("./errored-content-service");

				const result = retryErroredContent({
					queue:   "jikan-episodes",
					mediaId: 123,
				});

				expect(result).toEqual({ success: true });
				expect(facade.getErroredContent).toHaveBeenCalledWith({
					queue:   "jikan-episodes",
					mediaId: 123,
				});
				expect(facade.retryErroredContent).toHaveBeenCalledWith({
					queue:   "jikan-episodes",
					mediaId: 123,
				});
				expect(bus.next).toHaveBeenCalled();
			},
		);

		it(
			"returns a stable failure when the failed row has already disappeared",
			async () => {
				facade.getErroredContent.mockReturnValue(null);
				const { retryErroredContent } = await import("./errored-content-service");

				const result = retryErroredContent({
					queue: "characters",
					mediaId: 123,
				});

				expect(result).toEqual({
					success: false,
					error:   "This failed item is no longer available.",
				});
				expect(bus.next).not.toHaveBeenCalled();
			},
		);

		it(
			"blocks retry for non-retryable failed rows",
			async () => {
				facade.getErroredContent.mockReturnValue({
					queue:             "jikan-episodes",
					mediaId:           123,
					name:              "Test Media",
					queueStatus:        "failed",
					retryCount:        3,
					isHidden:           false,
					canOpenMedia:      true,
					canRetry:          false,
					isAutoRetryPlanned: false,
					isRetryExhausted:  true,
					recommendedAction: "report",
					fingerprint:       "NIMLAT-ERR-ABC123DEF456",
				});
				const { retryErroredContent } = await import("./errored-content-service");

				const result = retryErroredContent({
					queue:   "jikan-episodes",
					mediaId: 123,
				});

				expect(result).toEqual({
					success: false,
					error: "This failure is not retryable. Report it or hide it from this list.",
				});
				expect(facade.retryErroredContent).not.toHaveBeenCalled();
				expect(bus.next).not.toHaveBeenCalled();
			},
		);

		it(
			"hides a failed row and emits a queue change",
			async () => {
				const { hideErroredContent } = await import("./errored-content-service");

				const result = hideErroredContent({
					queue: "characters",
					mediaId: 123,
				});

				expect(result).toEqual({ success: true });
				expect(facade.hideErroredContent).toHaveBeenCalledWith({
					queue: "characters",
					mediaId: 123,
				});
				expect(bus.next).toHaveBeenCalled();
			},
		);

		it(
			"opens an existing GitHub issue for the fingerprint without hiding the row",
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
				const { reportErroredContent } = await import("./errored-content-service");

				const result = await reportErroredContent({
					queue:   "jikan-episodes",
					mediaId: 123,
				});

				expect(result).toEqual({
					success:     true,
					fingerprint: "NIMLAT-ERR-ABC123DEF456",
					reportUrl:   "https://github.com/Kunepro/nimlat/issues/10",
				});
				expect(shell.openExternal).toHaveBeenCalledWith("https://github.com/Kunepro/nimlat/issues/10");
				expect(facade.hideErroredContent).not.toHaveBeenCalled();
			},
		);

		it(
			"opens a prefilled GitHub issue when no fingerprint match exists",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn().mockResolvedValue({
						ok:   true,
						json: vi.fn().mockResolvedValue({ items: [] }),
					}),
				);
				const { reportErroredContent } = await import("./errored-content-service");

				const result = await reportErroredContent({
					queue:   "jikan-episodes",
					mediaId: 123,
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.reportUrl).toContain("https://github.com/Kunepro/nimlat/issues/new?");
					expect(result.reportUrl).toContain("NIMLAT-ERR-ABC123DEF456");
				}
				expect(shell.openExternal).toHaveBeenCalledOnce();
				expect(facade.hideErroredContent).not.toHaveBeenCalled();
			},
		);
	},
);
