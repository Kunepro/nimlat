import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import { createHash } from "node:crypto";
import {
	isTerminalJikanFailure,
	MAX_HYDRATION_RETRY_COUNT,
} from "./hydration-queue-policy";

export type FailedHydrationItemRow = Omit<
	ErroredContentItem,
	"canOpenMedia" | "canRetry" | "isHidden" | "isAutoRetryPlanned" | "isRetryExhausted" | "recommendedAction" | "fingerprint"
> & {
	canOpenMedia: number;
	isHidden: number;
};

export function normalizeFingerprintSegment(value: string | null | undefined): string {
	return (value || "unknown")
		.toLowerCase()
		.replace(
			/\d+/g,
			"#",
		)
		.replace(
			/\s+/g,
			" ",
		)
		.trim()
		.slice(
			0,
			240,
		);
}

export function getMediaFingerprintIdentity(row: FailedHydrationItemRow): string {
	if (row.idAniList != null) {
		return `anilist:${ row.idAniList }`;
	}

	if (row.idMal != null) {
		return `mal:${ row.idMal }`;
	}

	return `media:${ row.mediaId }`;
}

function getErroredContentFingerprint(row: FailedHydrationItemRow): string {
	const payload = [
		row.queue,
		getMediaFingerprintIdentity(row),
		row.failureReason ?? "unstructured_failure",
		normalizeFingerprintSegment(row.errorMessage),
	].join("|");

	return `NIMLAT-ERR-${ createHash("sha256")
		.update(payload)
		.digest("hex")
		.slice(
			0,
			12,
		)
		.toUpperCase() }`;
}

// Exposed for unit coverage of terminal queue policy without preparing the
// Electron-built native SQLite module in Vitest.
export function isTerminalJikanFailureForTest(
	queue: ErroredContentQueue,
	failureReason: string | null | undefined,
): boolean {
	return isTerminalJikanFailure(
		queue,
		failureReason,
	);
}

export function isTerminalFailedHydrationItem(row: FailedHydrationItemRow): boolean {
	return (row.queue === "jikan-episodes" || row.queue === "jikan-episode-thumbnails")
		&& row.failureReason != null
		&& isTerminalJikanFailure(
			row.queue,
			row.failureReason,
		);
}

export function toErroredContentItem(row: FailedHydrationItemRow): ErroredContentItem {
	const canRetry           = !isTerminalFailedHydrationItem(row);
	const isRetryExhausted   = row.retryCount >= MAX_HYDRATION_RETRY_COUNT;
	const isAutoRetryPlanned = canRetry
		&& row.queueStatus === "pending"
		&& row.retryCount > 0
		&& row.retryCount < MAX_HYDRATION_RETRY_COUNT;

	return {
		...row,
		canOpenMedia:      row.canOpenMedia === 1,
		isHidden:          row.isHidden === 1,
		canRetry,
		isAutoRetryPlanned,
		isRetryExhausted,
		recommendedAction: canRetry && !isRetryExhausted ? "retry" : "report",
		fingerprint:       getErroredContentFingerprint(row),
	};
}
