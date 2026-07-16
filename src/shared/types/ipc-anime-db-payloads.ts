import type { AniListMediaId } from "./nimlat-ids";

// AnimeDB lifecycle payloads are transport contracts for population, baseline
// download, startup readiness, and incremental update progress.
export interface PopulateAnimeDbProgressData {
	// Run-local ID-window ordinal retained for progress display and older callers.
	// Durable resume identity is lastProcessedId, not this value.
	currentPage: number;
	// Number of AniList page requests made since the current start/resume action.
	requestBatch?: number;
	// ID-window scans have no stable provider page total, so this remains null.
	totalPages: number | null;
	processedMedias: number;
	totalMedias: number | null;
	// Provider totals can lag the active catalog; while scanning, the UI must treat
	// them as a lower bound until the max-ID window is exhausted.
	totalMediasIsLowerBound?: boolean;
	currentStatus: "idle" | "running" | "retrying" | "paused" | "completed" | "error";
	autoRetryAttempt?: number;
	autoRetryMaxAttempts?: number;
	nextRetryAt?: number;
	errorMessage?: string;
	lastProcessedId?: AniListMediaId;
}

export type AnimeDbPopulationActionResult =
	| { success: true }
	| { success: false; error: string };

export interface AnimeDbDownloadProgressData {
	status: "idle" | "downloading" | "verifying" | "replacing" | "reconciling" | "completed" | "error" | "reconcile_error" | "canceled";
	receivedBytes: number;
	totalBytes: number | null;
	percent: number | null;
	speedBytesPerSecond: number | null;
	etaSeconds: number | null;
	version?: string;
	errorMessage?: string;
}

export type AnimeDbDownloadActionResult =
	| { success: true }
	| { success: false; error: string };

export interface AnimeDbDownloadReleaseStatus {
	installedVersion: string | null;
	latestVersion: string | null;
	updateAvailable: boolean;
	errorMessage?: string;
}

export interface AnimeDbStartupReadiness {
	status: "ready" | "empty" | "missing_schema" | "unavailable";
	canUseLocalCatalog: boolean;
	shouldDownloadBaseline: boolean;
	animeDbVersion: string | null;
	message: string;
}

export interface AnimeDbUpdateProgressData {
	status: "idle" | "running" | "paused" | "completed" | "error";
	phase: "idle" | "updated-at-sweep" | "tail-sweep" | "completed";
	currentPage: number;
	processedMedias: number;
	totalMedias: number | null;
	totalMediasIsLowerBound?: boolean;
	cutoffProviderUpdatedAt: number | null;
	lastSuccessfulProviderUpdatedAt: number | null;
	lastSuccessfulRunCompletedAt?: number;
	cooldownEndsAt?: number;
	lastProcessedProviderUpdatedAt?: number;
	lastProcessedId?: AniListMediaId;
	startedAt?: number;
	completedAt?: number;
	errorMessage?: string;
}

export type AnimeDbUpdateActionResult =
	| { success: true }
	| { success: false; error: string };
