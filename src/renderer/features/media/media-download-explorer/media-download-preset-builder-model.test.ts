import {
	describe,
	expect,
	it,
} from "vitest";
import {
	DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS,
	getDownloadPresetBuilderCategoryFields,
} from "./media-download-preset-builder-model";

describe(
	"media-download-preset-builder-model",
	() => {
		it(
			"defines stable preset builder field groups in render order",
			() => {
				expect(DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS.map(group => group.title)).toEqual([
					"Video",
					"Audio/Subs",
					"Origin",
				]);
				expect(DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS.flatMap(group => group.fields.map(field => field.placeholder))).toEqual([
					"Quality",
					"Source",
					"Format",
					"Audio codec",
					"Subtitles",
					"Complete/season",
					"Origin",
				]);
				expect(DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS[ 1 ]?.audioFlagValues).toEqual([ "5.1" ]);
			},
		);

		it(
			"exposes category fields without audio-codec pseudo fields",
			() => {
				expect(getDownloadPresetBuilderCategoryFields().map(field => field.category)).toEqual([
					"quality",
					"source",
					"format",
					"subtitles",
					"completion",
					"origin",
				]);
			},
		);
	},
);
