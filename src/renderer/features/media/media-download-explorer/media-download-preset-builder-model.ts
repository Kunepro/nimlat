import type { DownloadSearchKeywordCategory } from "@nimlat/types/download-search";
import { AUDIO_FLAG_VALUES } from "./media-download-explorer.utils";

export type DownloadPresetBuilderField =
	| {
	kind: "category";
	category: DownloadSearchKeywordCategory;
	placeholder: string;
}
	| {
	kind: "audioCodec";
	placeholder: string;
};

export interface DownloadPresetBuilderFieldGroup {
	title: string;
	fields: DownloadPresetBuilderField[];
	audioFlagValues?: string[];
}

export const DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS: DownloadPresetBuilderFieldGroup[] = [
	{
		title:  "Video",
		fields: [
			{
				kind:        "category",
				category:    "quality",
				placeholder: "Quality",
			},
			{
				kind:        "category",
				category:    "source",
				placeholder: "Source",
			},
			{
				kind:        "category",
				category:    "format",
				placeholder: "Format",
			},
		],
	},
	{
		title:           "Audio/Subs",
		fields:          [
			{
				kind:        "audioCodec",
				placeholder: "Audio codec",
			},
			{
				kind:        "category",
				category:    "subtitles",
				placeholder: "Subtitles",
			},
		],
		audioFlagValues: Array.from(AUDIO_FLAG_VALUES),
	},
	{
		title:  "Origin",
		fields: [
			{
				kind:        "category",
				category:    "completion",
				placeholder: "Complete/season",
			},
			{
				kind:        "category",
				category:    "origin",
				placeholder: "Origin",
			},
		],
	},
];

export function getDownloadPresetBuilderCategoryFields(): Array<Extract<DownloadPresetBuilderField, {
	kind: "category"
}>> {
	return DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS.flatMap(group => group.fields)
		.filter((field): field is Extract<DownloadPresetBuilderField, { kind: "category" }> => field.kind === "category");
}
