// Services host business logic and long-running workflows used by IPC/daemons.
import { BUS_AnimeDbDownloadProgress } from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	AnimeDbDownloadProgressData,
	AnimeDbDownloadReleaseStatus,
} from "@nimlat/types/ipc-payloads";
import fs from "node:fs";
import {
	defaultIfEmpty,
	lastValueFrom,
	tap,
} from "rxjs";
import {
	canMarkAnimeDbDownloadCanceledImmediately,
	shouldTreatAnimeDbDownloadFailureAsCanceled,
} from "./anime-db-download-failure-policy";
import { AnimeDbDownloadLifecycle } from "./anime-db-download-lifecycle";
import { getAnimeDbDownloadReleaseStatus as readAnimeDbDownloadReleaseStatus } from "./anime-db-download-release-status-service";
import { AnimeDbDownloadRunState } from "./anime-db-download-run-state";
import {
	type AnimeDbDownloadRunEvent,
	getAnimeDbDownloadTempPath,
	streamAnimeDbDownloadReplacement,
} from "./anime-db-download-runner";
import {
	type AnimeDbReplacementCommit,
	cleanupAnimeDbReplacementBackupAfterCommit,
	rollbackAnimeDbReplacementAfterFailedCommit,
} from "./anime-db-file-replacement";
import {
	getFailedInstalledAnimeDbUserGroupingReconcileVersion,
	needsAnimeDbUserGroupingReconcile,
	reconcileUserGroupingAfterAnimeDbInstallIfNeeded,
} from "./anime-db-post-install-reconcile";
import {
	getValidatedAnimeDbReleaseSourceConfig,
	resolveLatestAnimeDbRelease,
} from "./anime-db-release-resolution";

type AnimeDbDownloadActionResult =
	| { success: true }
	| { success: false; error: string };
type ResolvedAnimeDbDownloadOptions = {
	url: string;
	version: string;
	checksumSha256?: string;
};

export class AnimeDbDownloader {
	private static instance: AnimeDbDownloader | null = null;
	private readonly lifecycle                        = new AnimeDbDownloadLifecycle();
	private readonly runState                         = new AnimeDbDownloadRunState();

	private constructor() {
		// Singleton lifetime matches the main process and protects the one active download lifecycle.
	}

	public static getInstance(): AnimeDbDownloader {
		if (!AnimeDbDownloader.instance) {
			AnimeDbDownloader.instance = new AnimeDbDownloader();
		}
		return AnimeDbDownloader.instance;
	}

	public getProgress(): AnimeDbDownloadProgressData {
		return this.runState.getProgress();
	}

	public async getReleaseStatus(): Promise<AnimeDbDownloadReleaseStatus> {
		return readAnimeDbDownloadReleaseStatus();
	}

	public async start(): Promise<AnimeDbDownloadActionResult> {
		const startRequest = this.lifecycle.beginStartRequest();
		if (!startRequest.accepted) {
			return {
				success: false,
				error: startRequest.error,
			};
		}

		try {
			const failedInstalledReconcileVersion = getFailedInstalledAnimeDbUserGroupingReconcileVersion();
			if (failedInstalledReconcileVersion) {
				if (this.lifecycle.isCancellationRequested()) {
					this.runState.markCanceled();
					this.broadcastProgress();
					return { success: true };
				}

				const abortController = this.lifecycle.beginRun();
				if (!abortController) {
					this.runState.markCanceled();
					this.broadcastProgress();
					return { success: true };
				}

				return await this.startInstalledVersionReconcile(failedInstalledReconcileVersion);
			}

			const sourceConfig  = getValidatedAnimeDbReleaseSourceConfig();
			const latestRelease = await resolveLatestAnimeDbRelease(
				sourceConfig,
			);
			const installedVersion                = UserDbFacade.config.getAnimeDbVersion() ?? null;
			const reconcileInstalledVersion       = installedVersion === latestRelease.revisionTag
				&& needsAnimeDbUserGroupingReconcile(latestRelease.revisionTag);
			if (installedVersion === latestRelease.revisionTag && !reconcileInstalledVersion) {
				return {
					success: false,
					error:   `AnimeDB ${ latestRelease.revisionTag } is already installed`,
				};
			}

			if (this.lifecycle.isCancellationRequested()) {
				this.runState.markCanceled();
				this.broadcastProgress();
				return { success: true };
			}

			const abortController = this.lifecycle.beginRun();
			if (!abortController) {
				this.runState.markCanceled();
				this.broadcastProgress();
				return { success: true };
			}

			if (reconcileInstalledVersion) {
				return await this.startInstalledVersionReconcile(latestRelease.revisionTag);
			}

			return await this.startResolvedDownload(
				{
					url:            latestRelease.dbAsset.downloadUrl,
					version:        latestRelease.revisionTag,
					checksumSha256: latestRelease.checksumSha256,
				},
				abortController,
			);
		} catch (error) {
			if (this.lifecycle.isCancellationRequested()) {
				this.runState.markCanceled();
				this.broadcastProgress();
				return { success: true };
			}

			const normalizedError = this.normalizeRuntimeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.download.start",
				normalizedError,
				{ phase: "resolve-latest-release" },
			);
			const errorMessage = normalizedError.message;
			this.runState.markError(errorMessage);
			this.broadcastProgress();
			return {
				success: false,
				error:   errorMessage,
			};
		} finally {
			this.lifecycle.finish();
		}
	}

	public async cancel(): Promise<AnimeDbDownloadActionResult> {
		if (!this.lifecycle.requestCancel()) {
			return { success: true };
		}

		if (canMarkAnimeDbDownloadCanceledImmediately(this.runState.getProgress().status)) {
			this.runState.markCanceled();
			this.broadcastProgress();
		}
		return { success: true };
	}

	private setProgressStatus(
		status: AnimeDbDownloadProgressData["status"],
		extra: Partial<AnimeDbDownloadProgressData> = {},
	): void {
		this.runState.setStatus(
			status,
			extra,
		);
		this.broadcastProgress();
	}

	private markDownloadRunStarted(version: string): void {
		this.runState.markStarted(version);
		this.broadcastProgress();
	}

	private completeDownloadRun(): void {
		this.runState.markCompleted();
		this.broadcastProgress();
	}

	private async handleFailedDownloadRun(
		error: unknown,
		tempPath: string,
		protectedPhaseStarted: boolean,
		failureKind: "download" | "reconcile" = "download",
	): Promise<AnimeDbDownloadActionResult> {
		await this.cleanupTempFile(tempPath);
		const wasAborted = shouldTreatAnimeDbDownloadFailureAsCanceled({
			cancellationRequested: this.lifecycle.isCancellationRequested(),
			protectedPhaseStarted,
		});
		const normalizedError = this.normalizeRuntimeError(error);
		if (!wasAborted) {
			LoggerUtils.logMainServiceError(
				failureKind === "reconcile" ? "anime-db.download.reconcile" : "anime-db.download.run",
				normalizedError,
				{ tempPath },
			);
		}

		this.setProgressStatus(
			wasAborted ? "canceled" : failureKind === "reconcile" ? "reconcile_error" : "error",
			{
				errorMessage: wasAborted ? undefined : normalizedError.message,
			},
		);

		if (wasAborted) {
			return { success: true };
		}

		return {
			success: false,
			error: normalizedError.message,
		};
	}

	private async startInstalledVersionReconcile(version: string): Promise<AnimeDbDownloadActionResult> {
		this.runState.markReconcileStarted(version);
		this.broadcastProgress();

		try {
			reconcileUserGroupingAfterAnimeDbInstallIfNeeded(version);
			this.completeDownloadRun();
			return { success: true };
		} catch (error) {
			return this.handleFailedDownloadRun(
				error,
				getAnimeDbDownloadTempPath(),
				true,
				"reconcile",
			);
		}
	}

	private async finalizeInstalledAnimeDb(
		version: string,
		tempPath: string,
		commit: AnimeDbReplacementCommit,
	): Promise<AnimeDbDownloadActionResult> {
		try {
			// Stamp the attached release before reconcile; the reconcile boundary verifies
			// this exact version again before it mutates user-owned grouping rows.
			UserDbFacade.config.setAnimeDbVersion(version);
		} catch (error) {
			let installError = this.normalizeRuntimeError(error);
			try {
				await rollbackAnimeDbReplacementAfterFailedCommit(
					commit,
					installError,
				);
			} catch (rollbackError) {
				installError = this.normalizeRuntimeError(rollbackError);
			}

			return this.handleFailedDownloadRun(
				installError,
				tempPath,
				true,
			);
		}

		await cleanupAnimeDbReplacementBackupAfterCommit(commit);

		try {
			if (!needsAnimeDbUserGroupingReconcile(version)) {
				this.completeDownloadRun();
				return { success: true };
			}

			this.setProgressStatus(
				"reconciling",
				{ percent: 1 },
			);
			reconcileUserGroupingAfterAnimeDbInstallIfNeeded(version);
			this.completeDownloadRun();
			return { success: true };
		} catch (error) {
			return this.handleFailedDownloadRun(
				error,
				tempPath,
				true,
				"reconcile",
			);
		}
	}

	private async startResolvedDownload(
		options: ResolvedAnimeDbDownloadOptions,
		abortController: AbortController,
	): Promise<AnimeDbDownloadActionResult> {
		this.markDownloadRunStarted(options.version);

		const tempPath         = getAnimeDbDownloadTempPath();
		let replacementStarted = false;
		let replacementCommit: AnimeDbReplacementCommit | null = null;

		try {
			await lastValueFrom(streamAnimeDbDownloadReplacement({
				url:            options.url,
				version:        options.version,
				checksumSha256: options.checksumSha256,
				tempPath,
				signal:         abortController.signal,
			}).pipe(
				tap((event) => {
					if (event.action === "replacementCommitted") {
						replacementCommit = event.commit;
						return;
					}

					replacementStarted ||= event.action === "statusChanged" && event.status === "replacing";
					this.applyDownloadRunEvent(event);
				}),
				defaultIfEmpty(null),
			));
		} catch (error) {
			return this.handleFailedDownloadRun(
				error,
				tempPath,
				replacementStarted,
			);
		}

		if (!replacementCommit) {
			return this.handleFailedDownloadRun(
				new Error("AnimeDB replacement completed without a commit handle."),
				tempPath,
				replacementStarted,
			);
		}

		return this.finalizeInstalledAnimeDb(
			options.version,
			tempPath,
			replacementCommit,
		);
	}

	private applyDownloadRunEvent(event: Exclude<AnimeDbDownloadRunEvent, { action: "replacementCommitted" }>): void {
		switch (event.action) {
			case "transferProgress":
				this.runState.updateTransferProgress(event.progress);
				this.broadcastProgress();
				return;
			case "statusChanged":
				this.setProgressStatus(event.status);
				return;
		}
	}

	private normalizeRuntimeError(error: unknown): Error {
		return error instanceof Error
			? error
			: new Error(String(error));
	}

	private async cleanupTempFile(filePath: string): Promise<void> {
		try {
			await fs.promises.rm(
				filePath,
				{ force: true },
			);
		} catch {
			// Ignore cleanup errors.
		}
	}

	private broadcastProgress(): void {
		// Download/replace state is main-owned; renderer delivery is handled by the IPC bridge.
		BUS_AnimeDbDownloadProgress.next(this.getProgress());
	}
}

export function getAnimeDbDownloader(): AnimeDbDownloader {
	return AnimeDbDownloader.getInstance();
}

export async function startAnimeDbDownload(): Promise<AnimeDbDownloadActionResult> {
	return getAnimeDbDownloader().start();
}

export function getAnimeDbDownloadStatus(): AnimeDbDownloadProgressData {
	return getAnimeDbDownloader().getProgress();
}

export function getAnimeDbDownloadReleaseStatus(): Promise<AnimeDbDownloadReleaseStatus> {
	return getAnimeDbDownloader().getReleaseStatus();
}

export async function cancelAnimeDbDownload(): Promise<AnimeDbDownloadActionResult> {
	return getAnimeDbDownloader().cancel();
}
