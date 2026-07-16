import type { PlaybackIssueCategory } from "@nimlat/types/anime-db";
import { parsePlaybackIssueTimestampText } from "./playback-issue-time";

export interface PlaybackIssueFlagField {
	name: "hasDubIssue" | "hasSubIssue" | "hasEncodingIssue" | "hasAudioIssue" | "hasVideoIssue";
	label: string;
}

export const PLAYBACK_ISSUE_FLAG_FIELDS: readonly PlaybackIssueFlagField[] = [
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
];

export const PLAYBACK_ISSUE_CATEGORY_OPTIONS: ReadonlyArray<{ label: string; value: PlaybackIssueCategory }> = [
	{
		label: "Dub issue",
		value: "dub",
	},
	{
		label: "Subtitle issue",
		value: "sub",
	},
	{
		label: "Encoding issue",
		value: "encoding",
	},
	{
		label: "Audio issue",
		value: "audio",
	},
	{
		label: "Video issue",
		value: "video",
	},
];

export function isPlaybackIssueTimestampTextValid(value: unknown): boolean {
	return typeof value === "string" && parsePlaybackIssueTimestampText(value) !== null;
}
