import { useMemo } from "react";
import {
	createPlaybackIssueInitialFormValues,
	hasReportedFileIssue,
	type PlaybackIssueFormValues,
	type PlaybackIssueInitialState,
} from "../playback-issue-editor-model";

interface UsePlaybackIssueEditorInitialValuesResult {
	hasPlaybackIssue: boolean;
	initialValues: PlaybackIssueFormValues;
}

export function usePlaybackIssueEditorInitialValues({
																											initialHasAudioIssue,
																											initialHasDubIssue,
																											initialHasEncodingIssue,
																											initialHasSubIssue,
																											initialHasVideoIssue,
																											initialPlaybackIssueMoments,
																											initialPlaybackIssueNote,
																										}: PlaybackIssueInitialState): UsePlaybackIssueEditorInitialValuesResult {
	const initialState     = useMemo<PlaybackIssueInitialState>(
		() => ({
			initialHasAudioIssue,
			initialHasDubIssue,
			initialHasEncodingIssue,
			initialHasSubIssue,
			initialHasVideoIssue,
			initialPlaybackIssueMoments,
			initialPlaybackIssueNote,
		}),
		[
			initialHasAudioIssue,
			initialHasDubIssue,
			initialHasEncodingIssue,
			initialHasSubIssue,
			initialHasVideoIssue,
			initialPlaybackIssueMoments,
			initialPlaybackIssueNote,
		],
	);
	const initialValues    = useMemo(
		() => createPlaybackIssueInitialFormValues(initialState),
		[ initialState ],
	);
	const hasPlaybackIssue = useMemo(
		() => hasReportedFileIssue(initialValues),
		[ initialValues ],
	);

	return {
		hasPlaybackIssue,
		initialValues,
	};
}
