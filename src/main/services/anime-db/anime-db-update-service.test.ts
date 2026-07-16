// @vitest-environment node

import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	logMainServiceError: vi.fn(),
	updater:             {
		getProgress: vi.fn(),
		start:       vi.fn(),
		stop:        vi.fn(),
	},
}));

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: mocks.logMainServiceError,
		},
	}),
);

vi.mock(
	"./anime-db-updater",
	() => ({
		AnimeDbUpdater: {
			getInstance: () => mocks.updater,
		},
	}),
);

describe(
	"AnimeDbUpdateService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"normalizes non-Error start failures before returning the API result",
			async () => {
				mocks.updater.start.mockRejectedValue("start failed");

				const { AnimeDbUpdateService } = await import("./anime-db-update-service");

				await expect(AnimeDbUpdateService.start()).resolves.toEqual({
					success: false,
					error:   "start failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.update.start-api",
					expect.objectContaining({
						message: "start failed",
					}),
				);
			},
		);

		it(
			"normalizes non-Error stop failures before returning the API result",
			async () => {
				mocks.updater.stop.mockRejectedValue("stop failed");

				const { AnimeDbUpdateService } = await import("./anime-db-update-service");

				await expect(AnimeDbUpdateService.stop()).resolves.toEqual({
					success: false,
					error:   "stop failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.update.stop-api",
					expect.objectContaining({
						message: "stop failed",
					}),
				);
			},
		);
	},
);
