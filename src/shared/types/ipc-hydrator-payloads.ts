import type { MediaEpisodeUpdatesIssueReason } from "./anime-db-hydration";
import type {
	AniListMediaId,
	MalMediaId,
	MediaId,
} from "./nimlat-ids";

export type HydratorProgressQueue =
	| "characters"
	| "staff"
	| "jikan-episodes"
	| "jikan-episode-thumbnails";

export type ErroredContentQueue = HydratorProgressQueue;

export type ErroredContentRecommendedAction =
	| "retry"
	| "report";

export type ErroredContentQueueStatus =
	| "pending"
	| "processing"
	| "failed";

export interface ErroredContentItem {
	queue: ErroredContentQueue;
	mediaId: MediaId;
	name: string;
	format?: string | null;
	status?: string | null;
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
	errorMessage?: string | null;
	failureReason?: MediaEpisodeUpdatesIssueReason | null;
	queueStatus: ErroredContentQueueStatus;
	retryCount: number;
	lastTriedAt?: number | null;
	nextAutoRetryAt?: number | null;
	lastSuccessfulPage?: number | null;
	resumeFromPage?: number | null;
	isHidden: boolean;
	hiddenAt?: number | null;
	canOpenMedia: boolean;
	canRetry: boolean;
	isAutoRetryPlanned: boolean;
	isRetryExhausted: boolean;
	recommendedAction: ErroredContentRecommendedAction;
	fingerprint: string;
}

export interface ErroredContentPage {
	items: ErroredContentItem[];
	nextOffset: number | null;
	total: number;
}

export interface RetryErroredContentRequest {
	queue: ErroredContentQueue;
	mediaId: MediaId;
}

export type RetryErroredContentResult =
	| { success: true }
	| { success: false; error: string };

export interface RetryAllErroredContentRequest {
	queue?: ErroredContentQueue | null;
}

export type RetryAllErroredContentResult =
	| { success: true; retriedCount: number }
	| { success: false; error: string };

export interface HideErroredContentRequest {
	queue: ErroredContentQueue;
	mediaId: MediaId;
}

export type HideErroredContentResult =
	| { success: true }
	| { success: false; error: string };

export interface ReportErroredContentRequest {
	queue: ErroredContentQueue;
	mediaId: MediaId;
}

export type ReportErroredContentResult =
	| { success: true; fingerprint: string; reportUrl: string }
	| { success: false; error: string };

export type HydratorProgressStatus =
	| "running"
	| "completed"
	| "failed";

// `taskId` must remain stable for the full lifecycle so renderer lists can patch one visible task
// instead of appending duplicate running/completed/failed rows for the same work item.
export interface HydratorProgressEvent {
	taskId: string;
	queue: HydratorProgressQueue;
	status: HydratorProgressStatus;
	message: string;
	startedAt: number;
	updatedAt: number;
}
