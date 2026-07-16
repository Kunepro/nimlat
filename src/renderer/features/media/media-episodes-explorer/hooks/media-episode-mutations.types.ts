import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { EpisodePlaybackIssueMoment } from "@nimlat/types/ipc-payloads";

export interface EpisodePlaybackIssueSavePayload {
	integrationStatus: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments: EpisodePlaybackIssueMoment[];
}
