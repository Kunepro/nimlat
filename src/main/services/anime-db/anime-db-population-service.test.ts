// @vitest-environment node

import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	isDevModeEnabled:    vi.fn(),
	logMainServiceError: vi.fn(),
	populator:           {
		getProgress: vi.fn(),
		restart:     vi.fn(),
		start:       vi.fn(),
		stop:        vi.fn(),
	},
}));

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config: {
				isDevModeEnabled: mocks.isDevModeEnabled,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: mocks.logMainServiceError,
		},
	}),
);

vi.mock(
	"./populate-anime-db",
	() => ({
		AnimeDbPopulator: {
			getInstance: () => mocks.populator,
		},
	}),
);

describe(
	"AnimeDbPopulationService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			mocks.isDevModeEnabled.mockReturnValue(true);
		});

		it(
			"normalizes non-Error start failures before returning the API result",
			async () => {
				mocks.populator.start.mockRejectedValue("start failed");

				const { AnimeDbPopulationService } = await import("./anime-db-population-service");

				await expect(AnimeDbPopulationService.start()).resolves.toEqual({
					success: false,
					error:   "start failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.populate.start-api",
					expect.objectContaining({
						message: "start failed",
					}),
				);
			},
		);

		it(
			"normalizes non-Error stop failures before returning the API result",
			async () => {
				mocks.populator.stop.mockRejectedValue("stop failed");

				const { AnimeDbPopulationService } = await import("./anime-db-population-service");

				await expect(AnimeDbPopulationService.stop()).resolves.toEqual({
					success: false,
					error:   "stop failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.populate.stop-api",
					expect.objectContaining({
						message: "stop failed",
					}),
				);
			},
		);

		it(
			"normalizes non-Error restart failures before returning the API result",
			async () => {
				mocks.populator.restart.mockRejectedValue("restart failed");

				const { AnimeDbPopulationService } = await import("./anime-db-population-service");

				await expect(AnimeDbPopulationService.restart()).resolves.toEqual({
					success: false,
					error:   "restart failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.populate.restart-api",
					expect.objectContaining({
						message: "restart failed",
					}),
				);
			},
		);
	},
);
