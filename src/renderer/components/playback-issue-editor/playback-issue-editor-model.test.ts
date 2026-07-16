import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildPlaybackIssueSavePayload,
	createPlaybackIssueInitialFormValues,
	hasInitialPlaybackIssue,
	hasReportedFileIssue,
	joinPlaybackIssueEditorClassNames,
	resolvePlaybackIssueButtonPresentation,
} from "./playback-issue-editor-model";

describe(
	"playback-issue-editor-model",
	() => {
		it(
			"hydrates form values from persisted playback issue state",
			() => {
				expect(createPlaybackIssueInitialFormValues({
					initialPlaybackIssueNote:    "verify audio",
					initialHasAudioIssue:        true,
					initialPlaybackIssueMoments: [
						{
							playbackIssueCategory: "audio",
							timeSeconds:           75,
							note:                  "volume dip",
						},
					],
				})).toEqual({
					playbackIssueNote:    "verify audio",
					hasDubIssue:          false,
					hasSubIssue:          false,
					hasEncodingIssue:     false,
					hasAudioIssue:        true,
					hasVideoIssue:        false,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "audio",
							timestampText:         "1:15",
							note:                  "volume dip",
						},
					],
				});
			},
		);

		it(
			"detects reported file issues from notes, flags, or timestamped moments",
			() => {
				expect(hasReportedFileIssue({ playbackIssueNote: "   " })).toBe(false);
				expect(hasReportedFileIssue({ hasSubIssue: true })).toBe(true);
				expect(hasReportedFileIssue({
					playbackIssueMoments: [
						{
							playbackIssueCategory: "video",
							timestampText:         "0:42",
						},
					],
				})).toBe(true);
				expect(hasInitialPlaybackIssue({
					initialPlaybackIssueNote: "artifact",
				})).toBe(true);
			},
		);

		it(
			"builds save payloads and infers downloaded status for newly reported local file issues",
			() => {
				expect(buildPlaybackIssueSavePayload(
					{
						playbackIssueNote:    "artifact",
						hasVideoIssue:        true,
						playbackIssueMoments: [
							{
								playbackIssueCategory: "video",
								timestampText:         "1:02:03",
								note:                  "blocking frame",
							},
						],
					},
					null,
				)).toEqual({
					integrationStatus:    "downloaded",
					playbackIssueNote:    "artifact",
					hasDubIssue:          undefined,
					hasSubIssue:          undefined,
					hasEncodingIssue:     undefined,
					hasAudioIssue:        undefined,
					hasVideoIssue:        true,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "video",
							timeSeconds:           3_723,
							note:                  "blocking frame",
						},
					],
				});

				expect(buildPlaybackIssueSavePayload(
					{
						playbackIssueNote: "",
					},
					"integrated",
				).integrationStatus).toBe("integrated");
			},
		);

		it(
			"resolves trigger presentation and class names",
			() => {
				expect(resolvePlaybackIssueButtonPresentation({
					buttonLabel:      "Track file issues",
					buttonVariant:    "default",
					hasPlaybackIssue: true,
				})).toEqual({
					resolvedButtonLabel:     "Detected file issues",
					shouldRenderButtonLabel: true,
				});
				expect(resolvePlaybackIssueButtonPresentation({
					buttonLabel:      "Track file issues",
					buttonVariant:    "iconOnly",
					hasPlaybackIssue: false,
				})).toEqual({
					resolvedButtonLabel:     "Track file issues",
					shouldRenderButtonLabel: false,
				});
				expect(joinPlaybackIssueEditorClassNames(
					"base",
					false,
					undefined,
					"active",
				)).toBe("base active");
			},
		);
	},
);
