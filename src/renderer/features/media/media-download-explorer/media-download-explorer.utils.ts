import { buildDownloadSearchQuery } from "@nimlat/functions";
import {
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
	DownloadSearchMediaTitleOptions,
	DownloadSearchQueryPreset,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";

export const AUDIO_CODEC_VALUES = new Set([
	"AAC",
	"FLAC",
	"Opus",
]);

export const AUDIO_FLAG_VALUES = new Set([
	"5.1",
]);

const PRESET_SHORTCUTS = new Map<string, string>([
	[
		"dual audio",
		"Dual",
	],
	[
		"multi subs",
		"MultiSub",
	],
	[
		"English subs",
		"EngSub",
	],
	[
		"Complete",
		"Complete",
	],
	[
		"season",
		"Season",
	],
	[
		"SubsPlease",
		"SP",
	],
	[
		"Erai-raws",
		"Erai",
	],
]);

export function resolveDownloadSearchTitle(
	options: DownloadSearchMediaTitleOptions | undefined,
	fallbackName: string,
	language: DownloadSearchTitleLanguage,
): string {
	return options?.[ language ] || options?.english || options?.romaji || options?.native || fallbackName;
}

export function createDownloadSearchTitleOptions(options: DownloadSearchMediaTitleOptions | undefined, fallbackName: string) {
	return [
		{
			value: "english",
			label: `English: ${ options?.english || fallbackName }`,
		},
		...(options?.romaji
			? [
				{
					value: "romaji",
					label: `Romaji: ${ options.romaji }`,
				},
			]
			: []),
		...(options?.native
			? [
				{
					value: "native",
					label: `Native: ${ options.native }`,
				},
			]
			: []),
	];
}

export function findDownloadSearchPresetById(presets: DownloadSearchKeywordPreset[], presetId: string): DownloadSearchKeywordPreset | undefined {
	return presets.find((preset) => preset.id === presetId);
}

export function createDownloadSearchPresetOptions(presets: DownloadSearchKeywordPreset[], category: DownloadSearchKeywordCategory) {
	return presets
		.filter((preset) => preset.category === category)
		.map((preset) => ({
			value: preset.id,
			label: preset.label,
		}));
}

export function createDownloadSearchAudioCodecOptions(presets: DownloadSearchKeywordPreset[]) {
	return presets
		.filter((preset) => preset.category === "audio" && AUDIO_CODEC_VALUES.has(preset.value))
		.map((preset) => ({
			value: preset.id,
			label: preset.label,
		}));
}

export function getSelectedDownloadSearchPresetId(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
	category: DownloadSearchKeywordCategory,
): string | undefined {
	return selectedPresetIds.find((presetId) => findDownloadSearchPresetById(
		presets,
		presetId,
	)?.category === category);
}

function getSelectedDownloadSearchAudioCodecIds(presets: DownloadSearchKeywordPreset[], selectedPresetIds: string[]): string[] {
	return selectedPresetIds.filter((presetId) => {
		const preset = findDownloadSearchPresetById(
			presets,
			presetId,
		);
		return preset?.category === "audio" && AUDIO_CODEC_VALUES.has(preset.value);
	});
}

export function getSelectedDownloadSearchAudioCodecId(presets: DownloadSearchKeywordPreset[], selectedPresetIds: string[]): string | undefined {
	return getSelectedDownloadSearchAudioCodecIds(
		presets,
		selectedPresetIds,
	)[ 0 ];
}

export function isDownloadSearchAudioFlagSelected(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
	value: string,
): boolean {
	return selectedPresetIds.some((presetId) => {
		const preset = findDownloadSearchPresetById(
			presets,
			presetId,
		);
		return preset?.category === "audio" && preset.value === value;
	});
}

export function buildDownloadSearchPresetQuery(
	title: string,
	keywordPresets: DownloadSearchKeywordPreset[],
	queryPreset: Pick<DownloadSearchQueryPreset, "selectedPresetIds" | "customQueryText">,
): string {
	return buildDownloadSearchQuery(
		title,
		keywordPresets.filter((preset) => queryPreset.selectedPresetIds.includes(preset.id)),
		queryPreset.customQueryText,
	);
}

export function createCurrentDownloadSearchBuilderQuery(
	title: string,
	selectedPresets: DownloadSearchKeywordPreset[],
	customQueryText?: string,
): string {
	return buildDownloadSearchQuery(
		title,
		selectedPresets,
		customQueryText,
	);
}

export function createDownloadSearchQueryPresetLabel(selectedPresets: DownloadSearchKeywordPreset[], customQueryText: string): string {
	const parts      = selectedPresets.map((preset) => PRESET_SHORTCUTS.get(preset.value) ?? preset.label);
	const extra      = customQueryText
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(
			0,
			3,
		);
	const labelParts = [
		...parts,
		...extra,
	];
	return labelParts.length > 0 ? labelParts.join(" + ") : "Base";
}
