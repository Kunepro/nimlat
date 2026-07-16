import {
	PATH_ANIME_DB,
	PATH_DATA,
} from "@nimlat/constants/main/system-folders";
import { AnimeDbAttachmentService } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import fs from "node:fs";
import path from "node:path";

const DOWNLOAD_BACKUP_FILENAME = "anime_data.db.backup";

function normalizeRuntimeError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error(String(error));
}

interface AnimeDbReplaceFailureContext {
	rollbackError?: Error;
	restoreError?: Error;
}

export interface AnimeDbReplacementCommit {
	backupCreated: boolean;
	backupPath: string;
	wasAttachedBeforeReplace: boolean;
}

function buildAnimeDbReplaceFailureError(
	originalError: unknown,
	context: AnimeDbReplaceFailureContext = {},
): Error {
	const resolvedOriginalError = normalizeRuntimeError(originalError);
	if (!context.rollbackError && !context.restoreError) {
		return resolvedOriginalError;
	}

	const details: string[] = [];
	if (context.rollbackError) {
		details.push(`Rollback also failed: ${ context.rollbackError.message }.`);
	}
	if (context.restoreError) {
		details.push(
			context.rollbackError
				? `Re-attaching anime_data also failed: ${ context.restoreError.message }.`
				: `Rollback restored the previous file, but re-attaching anime_data also failed: ${ context.restoreError.message }.`,
		);
	}

	return new Error(`Anime DB replacement failed: ${ resolvedOriginalError.message }. ${ details.join(" ") }`);
}

function getAnimeDbDownloadBackupPath(): string {
	return path.join(
		PATH_DATA,
		DOWNLOAD_BACKUP_FILENAME,
	);
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(
			filePath,
			fs.constants.F_OK,
		);
		return true;
	} catch {
		return false;
	}
}

async function createAnimeDbBackupIfCurrentDbExists(backupPath: string): Promise<boolean> {
	if (!await fileExists(PATH_ANIME_DB)) {
		return false;
	}

	await fs.promises.rm(
		backupPath,
		{ force: true },
	);
	await fs.promises.rename(
		PATH_ANIME_DB,
		backupPath,
	);
	return true;
}

async function rollbackAnimeDbFromBackupIfPossible(
	backupCreated: boolean,
	backupPath: string,
): Promise<Error | null> {
	if (!backupCreated) {
		return null;
	}

	try {
		await fs.promises.rm(
			PATH_ANIME_DB,
			{ force: true },
		);
		await fs.promises.rename(
			backupPath,
			PATH_ANIME_DB,
		);
		return null;
	} catch (error) {
		return normalizeRuntimeError(error);
	}
}

async function rollbackFirstInstallAfterFailedCommit(): Promise<Error | null> {
	try {
		await fs.promises.rm(
			PATH_ANIME_DB,
			{ force: true },
		);
		return null;
	} catch (error) {
		return normalizeRuntimeError(error);
	}
}

export async function cleanupAnimeDbReplacementBackupAfterCommit(commit: AnimeDbReplacementCommit): Promise<void> {
	if (!commit.backupCreated) {
		return;
	}

	try {
		await fs.promises.rm(
			commit.backupPath,
			{ force: true },
		);
	} catch (cleanupError) {
		LoggerUtils.logMainServiceError(
			"anime-db.download.replace.cleanup-backup",
			normalizeRuntimeError(cleanupError),
			{
				backupPath: commit.backupPath,
				note: "Non-fatal: anime_data swap already succeeded.",
			},
		);
	}
}

export async function rollbackAnimeDbReplacementAfterFailedCommit(
	commit: AnimeDbReplacementCommit,
	originalError: unknown,
): Promise<void> {
	if (AnimeDbAttachmentService.isAnimeDataAttached()) {
		AnimeDbAttachmentService.detachAnimeDataIfAttached();
	}

	const rollbackError = commit.backupCreated
		? await rollbackAnimeDbFromBackupIfPossible(
			true,
			commit.backupPath,
		)
		: await rollbackFirstInstallAfterFailedCommit();

	let restoreError: Error | null = null;
	if (commit.wasAttachedBeforeReplace && !AnimeDbAttachmentService.isAnimeDataAttached()) {
		try {
			AnimeDbAttachmentService.attachAnimeData(PATH_ANIME_DB);
		} catch (attachError) {
			restoreError = normalizeRuntimeError(attachError);
		}
	}

	if (rollbackError || restoreError) {
		throw buildAnimeDbReplaceFailureError(
			originalError,
			{
				rollbackError: rollbackError ?? undefined,
				restoreError:  restoreError ?? undefined,
			},
		);
	}
}

export async function replaceAnimeDbFromDownload(tempPath: string): Promise<AnimeDbReplacementCommit> {
	const isAttached = AnimeDbAttachmentService.isAnimeDataAttached();

	if (isAttached) {
		AnimeDbAttachmentService.detachAnimeDataIfAttached();
	}

	const backupPath  = getAnimeDbDownloadBackupPath();
	let backupCreated = false;

	try {
		backupCreated = await createAnimeDbBackupIfCurrentDbExists(backupPath);

		// Promote only after the current DB has been moved aside; rollback can then restore the exact previous file.
		await fs.promises.rename(
			tempPath,
			PATH_ANIME_DB,
		);

		// Reattach on the existing connection so downstream DB consumers keep the same BUS-owned handle.
		AnimeDbAttachmentService.attachAnimeData(PATH_ANIME_DB);
	} catch (error) {
		const originalError = normalizeRuntimeError(error);
		const rollbackError = await rollbackAnimeDbFromBackupIfPossible(
			backupCreated,
			backupPath,
		);
		if (rollbackError) {
			LoggerUtils.logMainServiceError(
				"anime-db.download.replace.rollback",
				rollbackError,
				{
					backupCreated,
					backupPath,
					animeDbPath:      PATH_ANIME_DB,
					note:             "The previous anime_data file could not be restored after a failed swap.",
					swapErrorMessage: originalError.message,
				},
			);
		}

		let restoreError: Error | null = null;
		if (isAttached && !AnimeDbAttachmentService.isAnimeDataAttached()) {
			try {
				AnimeDbAttachmentService.attachAnimeData(PATH_ANIME_DB);
			} catch (attachError) {
				restoreError = normalizeRuntimeError(attachError);
				LoggerUtils.logMainServiceError(
					"anime-db.download.replace.restore-attach",
					restoreError,
					{
						backupCreated,
						backupPath,
						animeDbPath:      PATH_ANIME_DB,
						note:             "Primary swap failure already triggered rollback; the app could not re-attach anime_data afterwards.",
						swapErrorMessage: originalError.message,
					},
				);
			}
		}

		throw buildAnimeDbReplaceFailureError(
			originalError,
			{
				rollbackError: rollbackError ?? undefined,
				restoreError:  restoreError ?? undefined,
			},
		);
	}

	return {
		backupCreated,
		backupPath,
		wasAttachedBeforeReplace: isAttached,
	};
}
