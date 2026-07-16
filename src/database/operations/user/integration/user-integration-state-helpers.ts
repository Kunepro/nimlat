import type {
	EpisodeStateRow,
	MediaStateRow,
	PlaybackIssueFlagsRow,
} from "./user-integration-state-statements";

export function normalizePlaybackIssueNote(note?: string | null): string | null {
	const trimmedNote = note?.trim();
	return trimmedNote ? trimmedNote : null;
}

// Playback issues cap computed integration progress even when the user manually moves
// status forward; this preserves a visible "needs review" signal in aggregate state.
export function hasPlaybackIssues(flags: PlaybackIssueFlagsRow, playbackIssueMomentCount: number = 0): boolean {
	return Boolean(
		normalizePlaybackIssueNote(flags.playbackIssueNote)
		|| flags.hasDubIssue
		|| flags.hasSubIssue
		|| flags.hasEncodingIssue
		|| flags.hasAudioIssue
		|| flags.hasVideoIssue
		|| playbackIssueMomentCount > 0,
	);
}

export function toBooleanNumber(value?: boolean | number | null): number {
	return value ? 1 : 0;
}

export function toNumberAsBooleanLiteral(value?: boolean | number | null): 0 | 1 {
	return value ? 1 : 0;
}

export function getDefaultEpisodeState(): EpisodeStateRow {
	return {
		integrationStatus: null,
		playbackIssueNote: null,
		hasDubIssue:       0,
		hasSubIssue:       0,
		hasEncodingIssue:  0,
		hasAudioIssue:     0,
		hasVideoIssue:     0,
	};
}

export function getDefaultMediaState(): MediaStateRow {
	return {
		integrationStatus: null,
		playbackIssueNote: null,
		hasDubIssue:       0,
		hasSubIssue:       0,
		hasEncodingIssue:  0,
		hasAudioIssue:     0,
		hasVideoIssue:     0,
	};
}
