// @vitest-environment node
import path from "node:path";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	animeDataAttached:         vi.fn(),
	attachAnimeData:           vi.fn(),
	detachAnimeDataIfAttached: vi.fn(),
	logMainServiceError:       vi.fn(),
	access:                    vi.fn(),
	rm:                        vi.fn(),
	rename:                    vi.fn(),
}));

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_ANIME_DB: "C:\\fake\\anime_data.db",
		PATH_DATA:     "C:\\fake\\data",
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbAttachmentService: {
			isAnimeDataAttached:       mocks.animeDataAttached,
			detachAnimeDataIfAttached: mocks.detachAnimeDataIfAttached,
			attachAnimeData:           mocks.attachAnimeData,
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
	"node:fs",
	() => ({
		default: {
			constants: {
				F_OK: 0,
			},
			promises:  {
				access: mocks.access,
				rm:     mocks.rm,
				rename: mocks.rename,
			},
		},
	}),
);

const TEMP_PATH   = "C:\\fake\\data\\anime_data.db.download";
const ANIME_PATH  = "C:\\fake\\anime_data.db";
const BACKUP_PATH = path.join(
	"C:\\fake\\data",
	"anime_data.db.backup",
);

describe(
	"replaceAnimeDbFromDownload",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.resetAllMocks();
			mocks.animeDataAttached.mockReturnValue(true);
			mocks.access.mockResolvedValue(undefined);
			mocks.rm.mockResolvedValue(undefined);
			mocks.rename.mockResolvedValue(undefined);
		});

		it(
			"moves the current DB to backup before promoting the downloaded DB",
			async () => {
				const { replaceAnimeDbFromDownload } = await import("./anime-db-file-replacement");

				await expect(replaceAnimeDbFromDownload(TEMP_PATH)).resolves.toEqual({
					backupCreated:            true,
					backupPath:               BACKUP_PATH,
					wasAttachedBeforeReplace: true,
				});

				expect(mocks.detachAnimeDataIfAttached).toHaveBeenCalledTimes(1);
				expect(mocks.rm).toHaveBeenNthCalledWith(
					1,
					BACKUP_PATH,
					{ force: true },
				);
				expect(mocks.rename).toHaveBeenNthCalledWith(
					1,
					ANIME_PATH,
					BACKUP_PATH,
				);
				expect(mocks.rename).toHaveBeenNthCalledWith(
					2,
					TEMP_PATH,
					ANIME_PATH,
				);
				expect(mocks.attachAnimeData).toHaveBeenCalledWith(ANIME_PATH);
				expect(mocks.rm).toHaveBeenCalledTimes(1);
				expect(mocks.logMainServiceError).not.toHaveBeenCalled();
			},
		);

		it(
			"supports first install when no previous AnimeDB file exists",
			async () => {
				mocks.animeDataAttached.mockReturnValue(false);
				mocks.access.mockRejectedValue(new Error("missing"));
				const { replaceAnimeDbFromDownload } = await import("./anime-db-file-replacement");

				await expect(replaceAnimeDbFromDownload(TEMP_PATH)).resolves.toEqual({
					backupCreated:            false,
					backupPath:               BACKUP_PATH,
					wasAttachedBeforeReplace: false,
				});

				expect(mocks.detachAnimeDataIfAttached).not.toHaveBeenCalled();
				expect(mocks.rename).toHaveBeenCalledTimes(1);
				expect(mocks.rename).toHaveBeenCalledWith(
					TEMP_PATH,
					ANIME_PATH,
				);
				expect(mocks.attachAnimeData).toHaveBeenCalledWith(ANIME_PATH);
				expect(mocks.rm).not.toHaveBeenCalled();
			},
		);

		it(
			"restores the backup and preserves the original swap error when promotion fails",
			async () => {
				mocks.animeDataAttached
					.mockReturnValueOnce(true)
					.mockReturnValueOnce(false);
				mocks.rename
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(new Error("swap failed"))
					.mockResolvedValueOnce(undefined);
				const { replaceAnimeDbFromDownload } = await import("./anime-db-file-replacement");

				await expect(replaceAnimeDbFromDownload(TEMP_PATH)).rejects.toThrow("swap failed");

				expect(mocks.rm).toHaveBeenNthCalledWith(
					2,
					ANIME_PATH,
					{ force: true },
				);
				expect(mocks.rename).toHaveBeenNthCalledWith(
					3,
					BACKUP_PATH,
					ANIME_PATH,
				);
				expect(mocks.attachAnimeData).toHaveBeenCalledWith(ANIME_PATH);
				expect(mocks.logMainServiceError).not.toHaveBeenCalled();
			},
		);

		it(
			"logs rollback failure once and includes it in the replacement error",
			async () => {
				mocks.animeDataAttached
					.mockReturnValueOnce(true)
					.mockReturnValueOnce(false);
				mocks.rm
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(new Error("rollback rm failed"));
				mocks.rename
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(new Error("swap failed"));
				const { replaceAnimeDbFromDownload } = await import("./anime-db-file-replacement");

				await expect(replaceAnimeDbFromDownload(TEMP_PATH)).rejects.toThrow(
					"Anime DB replacement failed: swap failed. Rollback also failed: rollback rm failed.",
				);
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.download.replace.rollback",
					expect.any(Error),
					expect.objectContaining({
						backupPath:       BACKUP_PATH,
						animeDbPath:      ANIME_PATH,
						swapErrorMessage: "swap failed",
					}),
				);
				expect(mocks.attachAnimeData).toHaveBeenCalledWith(ANIME_PATH);
			},
		);

		it(
			"preserves the original swap error when rollback restore attach also fails",
			async () => {
				mocks.animeDataAttached
					.mockReturnValueOnce(true)
					.mockReturnValueOnce(false);
				mocks.attachAnimeData.mockImplementation(() => {
					throw new Error("reattach failed");
				});
				mocks.rename
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(new Error("swap failed"))
					.mockResolvedValueOnce(undefined);
				const { replaceAnimeDbFromDownload } = await import("./anime-db-file-replacement");

				await expect(replaceAnimeDbFromDownload(TEMP_PATH)).rejects.toThrow(
					"Anime DB replacement failed: swap failed. Rollback restored the previous file, but re-attaching anime_data also failed: reattach failed.",
				);
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.download.replace.restore-attach",
					expect.any(Error),
					expect.objectContaining({
						swapErrorMessage: "swap failed",
					}),
				);
			},
		);

		it(
			"logs backup cleanup failure as non-fatal after a successful swap",
			async () => {
				mocks.rm.mockRejectedValueOnce(new Error("cleanup failed"));
				const { cleanupAnimeDbReplacementBackupAfterCommit } = await import("./anime-db-file-replacement");

				await expect(cleanupAnimeDbReplacementBackupAfterCommit({
					backupCreated:            true,
					backupPath:               BACKUP_PATH,
					wasAttachedBeforeReplace: true,
				})).resolves.toBeUndefined();

				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.download.replace.cleanup-backup",
					expect.any(Error),
					expect.objectContaining({
						backupPath: BACKUP_PATH,
						note:       "Non-fatal: anime_data swap already succeeded.",
					}),
				);
			},
		);

		it(
			"rolls back a promoted DB when the user-data install commit fails",
			async () => {
				mocks.animeDataAttached
					.mockReturnValueOnce(true)
					.mockReturnValueOnce(false);
				const { rollbackAnimeDbReplacementAfterFailedCommit } = await import("./anime-db-file-replacement");

				await expect(rollbackAnimeDbReplacementAfterFailedCommit(
					{
						backupCreated:            true,
						backupPath:               BACKUP_PATH,
						wasAttachedBeforeReplace: true,
					},
					new Error("version stamp failed"),
				)).resolves.toBeUndefined();

				expect(mocks.detachAnimeDataIfAttached).toHaveBeenCalledTimes(1);
				expect(mocks.rm).toHaveBeenCalledWith(
					ANIME_PATH,
					{ force: true },
				);
				expect(mocks.rename).toHaveBeenCalledWith(
					BACKUP_PATH,
					ANIME_PATH,
				);
				expect(mocks.attachAnimeData).toHaveBeenCalledWith(ANIME_PATH);
			},
		);

		it(
			"removes a first-install DB when the user-data install commit fails",
			async () => {
				const { rollbackAnimeDbReplacementAfterFailedCommit } = await import("./anime-db-file-replacement");

				await expect(rollbackAnimeDbReplacementAfterFailedCommit(
					{
						backupCreated:            false,
						backupPath:               BACKUP_PATH,
						wasAttachedBeforeReplace: false,
					},
					new Error("version stamp failed"),
				)).resolves.toBeUndefined();

				expect(mocks.detachAnimeDataIfAttached).toHaveBeenCalledTimes(1);
				expect(mocks.rm).toHaveBeenCalledWith(
					ANIME_PATH,
					{ force: true },
				);
				expect(mocks.rename).not.toHaveBeenCalled();
				expect(mocks.attachAnimeData).not.toHaveBeenCalled();
			},
		);
	},
);
