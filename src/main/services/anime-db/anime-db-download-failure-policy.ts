import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";

interface AnimeDbDownloadFailurePolicyInput {
	cancellationRequested: boolean;
	protectedPhaseStarted: boolean;
}

export function shouldTreatAnimeDbDownloadFailureAsCanceled({
																															cancellationRequested,
																															protectedPhaseStarted,
																														}: AnimeDbDownloadFailurePolicyInput): boolean {
	// File replacement and grouping reconcile are protected integrity phases. A
	// late cancel request must not hide a swap, rollback, or reconcile failure.
	return cancellationRequested && !protectedPhaseStarted;
}

export function canMarkAnimeDbDownloadCanceledImmediately(status: AnimeDbDownloadProgressData["status"]): boolean {
	return status !== "replacing" && status !== "reconciling";
}
