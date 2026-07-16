import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { EpisodePlaybackIssueMoment } from "@nimlat/types/ipc-payloads";
import {
	formatPlaybackIssueTimestampSeconds,
	parsePlaybackIssueTimestampText,
} from "../../modals/shared/playback-issue-time";

export type PlaybackIssueButtonVariant = "default" | "iconOnly" | "vertical";

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

export interface PlaybackIssueFormValues {
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments?: Array<{
		playbackIssueCategory: EpisodePlaybackIssueMoment["playbackIssueCategory"];
		timestampText: string;
		note?: string;
	}>;
}

export interface PlaybackIssueInitialState {
	initialPlaybackIssueNote?: string;
	initialHasDubIssue?: boolean;
	initialHasSubIssue?: boolean;
	initialHasEncodingIssue?: boolean;
	initialHasAudioIssue?: boolean;
	initialHasVideoIssue?: boolean;
	initialPlaybackIssueMoments?: EpisodePlaybackIssueMoment[];
}

export interface PlaybackIssueButtonPresentationInput {
	buttonLabel: string;
	buttonVariant: PlaybackIssueButtonVariant;
	hasPlaybackIssue: boolean;
}

export interface PlaybackIssueButtonPresentation {
	resolvedButtonLabel: string;
	shouldRenderButtonLabel: boolean;
}

export function createPlaybackIssueInitialFormValues({
																											 initialPlaybackIssueNote,
																											 initialHasDubIssue,
																											 initialHasSubIssue,
																											 initialHasEncodingIssue,
																											 initialHasAudioIssue,
																											 initialHasVideoIssue,
																											 initialPlaybackIssueMoments,
																										 }: PlaybackIssueInitialState): PlaybackIssueFormValues {
	return {
		playbackIssueNote:    initialPlaybackIssueNote || "",
		hasDubIssue:          initialHasDubIssue ?? false,
		hasSubIssue:          initialHasSubIssue ?? false,
		hasEncodingIssue:     initialHasEncodingIssue ?? false,
		hasAudioIssue:        initialHasAudioIssue ?? false,
		hasVideoIssue:        initialHasVideoIssue ?? false,
		playbackIssueMoments: (initialPlaybackIssueMoments || []).map((moment) => ({
			playbackIssueCategory: moment.playbackIssueCategory,
			timestampText:         formatPlaybackIssueTimestampSeconds(moment.timeSeconds),
			note:                  moment.note,
		})),
	};
}

export function hasReportedFileIssue(values: PlaybackIssueFormValues): boolean {
	return Boolean(
		values.playbackIssueNote?.trim()
		|| values.hasDubIssue
		|| values.hasSubIssue
		|| values.hasEncodingIssue
		|| values.hasAudioIssue
		|| values.hasVideoIssue
		|| (values.playbackIssueMoments?.length || 0) > 0,
	);
}

export function hasInitialPlaybackIssue(initialState: PlaybackIssueInitialState): boolean {
	return hasReportedFileIssue(createPlaybackIssueInitialFormValues(initialState));
}

export function resolvePlaybackIssueButtonPresentation({
																												 buttonLabel,
																												 buttonVariant,
																												 hasPlaybackIssue,
																											 }: PlaybackIssueButtonPresentationInput): PlaybackIssueButtonPresentation {
	return {
		resolvedButtonLabel:     hasPlaybackIssue && buttonLabel === "Track file issues"
															 ? "Detected file issues"
															 : buttonLabel,
		shouldRenderButtonLabel: buttonVariant !== "iconOnly",
	};
}

export function buildPlaybackIssueSavePayload(
	values: PlaybackIssueFormValues,
	currentIntegrationStatus: IntegrationStatus | null,
): PlaybackIssueSavePayload {
	// A newly reported file issue implies the file exists locally even when the
	// surrounding surface has not tracked an integration state yet.
	const nextIntegrationStatus = currentIntegrationStatus == null && hasReportedFileIssue(values)
		? "downloaded"
		: currentIntegrationStatus ?? null;

	return {
		integrationStatus:    nextIntegrationStatus,
		playbackIssueNote:    values.playbackIssueNote,
		hasDubIssue:          values.hasDubIssue,
		hasSubIssue:          values.hasSubIssue,
		hasEncodingIssue:     values.hasEncodingIssue,
		hasAudioIssue:        values.hasAudioIssue,
		hasVideoIssue:        values.hasVideoIssue,
		playbackIssueMoments: (values.playbackIssueMoments || []).map((moment) => ({
			playbackIssueCategory: moment.playbackIssueCategory,
			timeSeconds:           parsePlaybackIssueTimestampText(moment.timestampText) ?? 0,
			note:                  moment.note,
		})),
	};
}

export function joinPlaybackIssueEditorClassNames(...classNames: Array<string | false | null | undefined>): string {
	return classNames.filter(Boolean).join(" ");
}
