import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	clearAnimeDbScanCheckpointSafely,
	loadAnimeDbPopulateCursorStateSafely,
	loadPersistedAnimeDbMediaCountSafely,
	saveAnimeDbScanCheckpointSafely,
} from "./anime-db-populate-checkpoint-store";

const {
				clearCheckpointMock,
				getBaselineMock,
				loadCheckpointMock,
				logMainServiceErrorMock,
				saveCheckpointMock,
			} = vi.hoisted(() => ({
	clearCheckpointMock:     vi.fn(),
	getBaselineMock:         vi.fn(),
	loadCheckpointMock:      vi.fn(),
	logMainServiceErrorMock: vi.fn(),
	saveCheckpointMock:      vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			scanState: {
				clearAnimeDbScanCheckpoint: clearCheckpointMock,
				getAnimeDbUpdateBaseline:   getBaselineMock,
				loadAnimeDbScanCheckpoint:  loadCheckpointMock,
				saveAnimeDbScanCheckpoint:  saveCheckpointMock,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: logMainServiceErrorMock,
		},
	}),
);

describe(
	"anime-db-populate-checkpoint-store",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			getBaselineMock.mockReturnValue({
				mediaCount:           123,
				maxProviderUpdatedAt: null,
			});
		});

		it(
			"loads persisted checkpoint cursor state with the current media count",
			() => {
				loadCheckpointMock.mockReturnValue({
					version:              2,
					lastCompletedPage:    4,
					lastPersistedMediaId: 450,
					updatedAt:            1,
				});

				expect(loadAnimeDbPopulateCursorStateSafely()).toEqual({
					persistedCompletedPage: 4,
					persistedLastMediaId:   450,
					persistedMediaCount:    123,
				});
			},
		);

		it(
			"falls back to an empty cursor when checkpoint loading fails",
			() => {
				const error = new Error("bad checkpoint");
				loadCheckpointMock.mockImplementation(() => {
					throw error;
				});

				expect(loadAnimeDbPopulateCursorStateSafely()).toEqual({
					persistedCompletedPage: 0,
					persistedLastMediaId:   0,
					persistedMediaCount:    0,
				});
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.load-scan-checkpoint",
					error,
				);
			},
		);

		it(
			"normalizes non-Error checkpoint load failures before logging",
			() => {
				loadCheckpointMock.mockImplementation(() => {
					throw "bad checkpoint";
				});

				expect(loadAnimeDbPopulateCursorStateSafely()).toEqual({
					persistedCompletedPage: 0,
					persistedLastMediaId:   0,
					persistedMediaCount:    0,
				});
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.load-scan-checkpoint",
					expect.objectContaining({
						message: "bad checkpoint",
					}),
				);
			},
		);

		it(
			"saves checkpoints with the current cursor state",
			() => {
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(10_000);

				saveAnimeDbScanCheckpointSafely({
					persistedCompletedPage: 7,
					persistedLastMediaId:   701,
					persistedMediaCount:    123,
				});

				expect(saveCheckpointMock).toHaveBeenCalledWith({
					version:              2,
					lastCompletedPage:    7,
					lastPersistedMediaId: 701,
					updatedAt:            10_000,
				});
			},
		);

		it(
			"normalizes non-Error checkpoint save failures before logging",
			() => {
				saveCheckpointMock.mockImplementation(() => {
					throw "save failed";
				});

				saveAnimeDbScanCheckpointSafely({
					persistedCompletedPage: 7,
					persistedLastMediaId:   701,
					persistedMediaCount:    123,
				});

				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.save-scan-checkpoint",
					expect.objectContaining({
						message: "save failed",
					}),
					expect.objectContaining({
						persistedCompletedPage: 7,
						persistedLastMediaId:   701,
					}),
				);
			},
		);

		it(
			"logs checkpoint clear failures without throwing",
			() => {
				const error = new Error("clear failed");
				clearCheckpointMock.mockImplementation(() => {
					throw error;
				});

				expect(() => clearAnimeDbScanCheckpointSafely()).not.toThrow();
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.clear-scan-checkpoint",
					error,
				);
			},
		);

		it(
			"normalizes non-Error checkpoint clear failures before logging",
			() => {
				clearCheckpointMock.mockImplementation(() => {
					throw "clear failed";
				});

				expect(() => clearAnimeDbScanCheckpointSafely()).not.toThrow();
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.clear-scan-checkpoint",
					expect.objectContaining({
						message: "clear failed",
					}),
				);
			},
		);

		it(
			"normalizes non-Error persisted media count failures before logging",
			() => {
				getBaselineMock.mockImplementation(() => {
					throw "count failed";
				});

				expect(loadPersistedAnimeDbMediaCountSafely()).toBe(0);
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.load-persisted-media-count",
					expect.objectContaining({
						message: "count failed",
					}),
				);
			},
		);
	},
);
