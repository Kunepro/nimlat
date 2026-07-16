import type { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";

export interface EpisodeUpdatesIssuePresentation {
	canRetry: boolean;
	description: string;
	message: string;
	type: "error" | "warning";
}

type EpisodeUpdatesActiveStatus = "pending" | "processing";
type EpisodeUpdatesDisplayMode = "empty-state" | "inline-action";

export interface EpisodeUpdatesActivePresentation {
	buttonLabel: string;
	message: string;
}

// Translate the structured episode-updates issue into compact user-facing alert copy.
// The renderer consumes explicit reasons so it never has to parse raw queue error strings.
// Thumbnail coverage is intentionally absent here: missing thumbnails are not a
// user-facing episode update problem.
export function buildEpisodeUpdatesIssuePresentation(issue: MediaEpisodeUpdatesIssue): EpisodeUpdatesIssuePresentation {
	switch (issue.reason) {
		case "missing_mal_id":
			return {
				type:        "warning",
				message:     "Episode updates are unavailable for this media",
				description: "This media has no episode mapping, so episode metadata cannot be loaded.",
				canRetry:    false,
			};
		case "jikan_resource_unavailable":
			return {
				type:        "warning",
				message:     "Episode intel unavailable",
				description: "Retry scan to check whether episode details can be loaded now.",
				canRetry:    true,
			};
		case "network_unavailable":
			return {
				type:        "warning",
				message:     issue.status === "failed"
											 ? "Episode updates could not continue while offline"
											 : "Episode updates are waiting for the network",
				description: "Reconnect to the internet and retry if the updates do not resume automatically.",
				canRetry:    issue.status === "failed",
			};
		case "transient_failure":
		default:
			return {
				type:        "error",
				message:     "Episode updates failed",
				description: issue.errorMessage || "Episode updates could not be completed.",
				canRetry:    true,
			};
	}
}

export function buildEpisodeUpdatesActivePresentation(status: EpisodeUpdatesActiveStatus, mode: EpisodeUpdatesDisplayMode): EpisodeUpdatesActivePresentation {
	if (status === "processing") {
		return mode === "inline-action"
			? {
				buttonLabel: "Reloading episodes",
				message:     "Episode reload is already running in the background.",
			}
			: {
				buttonLabel: "Reloading episodes",
				message:     "Episode metadata is being loaded.",
			};
	}

	return mode === "inline-action"
		? {
			buttonLabel: "Refresh queued",
			message:     "Episode reload is queued and will update this list when it finishes.",
		}
		: {
			buttonLabel: "Refresh queued",
			message:     "Episode metadata is queued for loading.",
		};
}

export function createRetryPendingIssue(mediaId: number): MediaEpisodeUpdatesIssue {
	return {
		mediaId,
		status:     "pending",
		retryCount: 0,
	};
}

export function createRetryFailedIssue(
	mediaId: number,
	errorMessage: string,
	retryCount: number,
): MediaEpisodeUpdatesIssue {
	return {
		mediaId,
		status: "failed",
		errorMessage,
		retryCount,
	};
}

export function toEpisodeUpdatesRetryErrorMessage(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: "Episode updates could not be queued.";
}
