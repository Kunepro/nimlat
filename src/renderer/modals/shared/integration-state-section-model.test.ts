// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	isPlaybackIssueTimestampTextValid,
	PLAYBACK_ISSUE_CATEGORY_OPTIONS,
	PLAYBACK_ISSUE_FLAG_FIELDS,
} from "./integration-state-section-model";

describe(
	"integration-state-section-model",
	() => {
		it(
			"keeps playback issue flag fields in the form order",
			() => {
				expect(PLAYBACK_ISSUE_FLAG_FIELDS).toEqual([
					{
						name:  "hasDubIssue",
						label: "Dub issue",
					},
					{
						name:  "hasSubIssue",
						label: "Subtitle issue",
					},
					{
						name:  "hasEncodingIssue",
						label: "Encoding issue",
					},
					{
						name:  "hasAudioIssue",
						label: "Audio issue",
					},
					{
						name:  "hasVideoIssue",
						label: "Video issue",
					},
				]);
			},
		);

		it(
			"keeps playback issue categories aligned with persisted values",
			() => {
				expect(PLAYBACK_ISSUE_CATEGORY_OPTIONS.map(option => option.value)).toEqual([
					"dub",
					"sub",
					"encoding",
					"audio",
					"video",
				]);
			},
		);

		it(
			"validates playback issue timestamp text",
			() => {
				expect(isPlaybackIssueTimestampTextValid("11:40")).toBe(true);
				expect(isPlaybackIssueTimestampTextValid("01:02:03")).toBe(true);
				expect(isPlaybackIssueTimestampTextValid("not-time")).toBe(false);
				expect(isPlaybackIssueTimestampTextValid(null)).toBe(false);
			},
		);
	},
);
