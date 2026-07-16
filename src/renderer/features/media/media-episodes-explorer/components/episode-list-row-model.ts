import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	EpisodePlaybackIssueMoment,
	MediaEpisodeInspectionRow,
} from "@nimlat/types/ipc-payloads";

export interface PlaybackIssueSavePayload {
	integrationStatus: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments: EpisodePlaybackIssueMoment[];
}

export interface EpisodeListRowProps {
	mediaId: string;
	episode: MediaEpisodeInspectionRow;
	episodeThumbnail: string;
	placeholderThumbnail: string;
	recapLabel: string;
	virtualStart: number;
	rowHeight: number;
	isSelected: boolean;
	isUpdatingStatus: boolean;
	isUpdatingWatched: boolean;
	onSelectionChange: (episodeNumber: number, isSelected: boolean, shouldExtendRange: boolean) => void;
	onIntegrationStatusChange: (episodeNumber: number, nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	onWatchedToggle: (episodeNumber: number, nextIsWatched: boolean) => void | Promise<void>;
	onEdit: (episode: MediaEpisodeInspectionRow) => void;
	onPlaybackIssueSave: (episode: MediaEpisodeInspectionRow, payload: PlaybackIssueSavePayload) => Promise<void>;
}

export interface EpisodeListRowStyle {
	height: number;
	transform: string;
}

export function createEpisodeListRowStyle(virtualStart: number, rowHeight: number): EpisodeListRowStyle {
	return {
		height:    rowHeight,
		transform: `translate3d(0, ${ virtualStart }px, 0)`,
	};
}

export function resolveEpisodeThumbnailAlt(episode: MediaEpisodeInspectionRow): string {
	return episode.name || `Episode ${ episode.episodeNumber }`;
}

export function resolveEpisodeTitle(episode: MediaEpisodeInspectionRow): string {
	return `E ${ episode.episodeNumber }: ${ episode.name || "Title not available yet" }`;
}

export function resolveEpisodeWatchedToggle(episode: MediaEpisodeInspectionRow) {
	const isWatched = episode.isWatched === true;

	return {
		status:        isWatched ? "watched" : "unwatched" as "watched" | "unwatched",
		checked:       isWatched,
		nextIsWatched: !isWatched,
		ariaLabel:     `${ isWatched ? "Unmark" : "Mark" } episode ${ episode.episodeNumber } as watched`,
	};
}

function arePlaybackIssueMomentsEqual(
	previousMoments?: EpisodePlaybackIssueMoment[],
	nextMoments?: EpisodePlaybackIssueMoment[],
): boolean {
	if (previousMoments === nextMoments) {
		return true;
	}
	if ((previousMoments?.length ?? 0) !== (nextMoments?.length ?? 0)) {
		return false;
	}

	return (previousMoments ?? []).every((previousMoment, index) => {
		const nextMoment = nextMoments?.[ index ];
		return previousMoment.playbackIssueCategory === nextMoment?.playbackIssueCategory
			&& previousMoment.timeSeconds === nextMoment?.timeSeconds
			&& previousMoment.note === nextMoment?.note;
	});
}

function areEpisodeRowsEqual(
	previousEpisode: MediaEpisodeInspectionRow,
	nextEpisode: MediaEpisodeInspectionRow,
): boolean {
	return previousEpisode.mediaId === nextEpisode.mediaId
		&& previousEpisode.episodeNumber === nextEpisode.episodeNumber
		&& previousEpisode.isWatched === nextEpisode.isWatched
		&& previousEpisode.name === nextEpisode.name
		&& previousEpisode.description === nextEpisode.description
		&& previousEpisode.recap === nextEpisode.recap
		&& previousEpisode.aired === nextEpisode.aired
		&& previousEpisode.duration === nextEpisode.duration
		&& previousEpisode.score === nextEpisode.score
		&& previousEpisode.filler === nextEpisode.filler
		&& previousEpisode.thumbnail === nextEpisode.thumbnail
		&& previousEpisode.displayThumbnailUrl === nextEpisode.displayThumbnailUrl
		&& previousEpisode.displayThumbnailSource === nextEpisode.displayThumbnailSource
		&& previousEpisode.integrationPercent === nextEpisode.integrationPercent
		&& previousEpisode.integrationStatus === nextEpisode.integrationStatus
		&& previousEpisode.playbackIssueNote === nextEpisode.playbackIssueNote
		&& previousEpisode.hasDubIssue === nextEpisode.hasDubIssue
		&& previousEpisode.hasSubIssue === nextEpisode.hasSubIssue
		&& previousEpisode.hasEncodingIssue === nextEpisode.hasEncodingIssue
		&& previousEpisode.hasAudioIssue === nextEpisode.hasAudioIssue
		&& previousEpisode.hasVideoIssue === nextEpisode.hasVideoIssue
		&& arePlaybackIssueMomentsEqual(
			previousEpisode.playbackIssueMoments,
			nextEpisode.playbackIssueMoments,
		);
}

export function areEpisodeListRowPropsEqual(previous: EpisodeListRowProps, next: EpisodeListRowProps): boolean {
	return previous.mediaId === next.mediaId
		&& areEpisodeRowsEqual(
			previous.episode,
			next.episode,
		)
		&& previous.episodeThumbnail === next.episodeThumbnail
		&& previous.placeholderThumbnail === next.placeholderThumbnail
		&& previous.recapLabel === next.recapLabel
		&& previous.virtualStart === next.virtualStart
		&& previous.rowHeight === next.rowHeight
		&& previous.isSelected === next.isSelected
		&& previous.isUpdatingStatus === next.isUpdatingStatus
		&& previous.isUpdatingWatched === next.isUpdatingWatched;
}
