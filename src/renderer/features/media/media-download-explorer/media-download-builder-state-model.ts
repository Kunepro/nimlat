import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";
import type { MediaDownloadInspection } from "../../../types/media-download";
import {
	AUDIO_CODEC_VALUES,
	findDownloadSearchPresetById,
	resolveDownloadSearchTitle,
} from "./media-download-explorer.utils";

function replaceDownloadSearchCategoryPresetId(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
	category: DownloadSearchKeywordCategory,
	nextPresetId: string | undefined,
): string[] {
	return [
		...selectedPresetIds.filter((presetId) => findDownloadSearchPresetById(
			presets,
			presetId,
		)?.category !== category),
		...(nextPresetId ? [ nextPresetId ] : []),
	];
}

function replaceDownloadSearchAudioCodecPresetId(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
	nextPresetId: string | undefined,
): string[] {
	return [
		...selectedPresetIds.filter((presetId) => {
			const preset = findDownloadSearchPresetById(
				presets,
				presetId,
			);
			return preset?.category !== "audio" || !AUDIO_CODEC_VALUES.has(preset.value);
		}),
		...(nextPresetId ? [ nextPresetId ] : []),
	];
}

function toggleDownloadSearchAudioFlagPresetId(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
	value: string,
	enabled: boolean,
): string[] {
	const flagPreset = presets.find((preset) => preset.category === "audio" && preset.value === value);
	if (!flagPreset) {
		return selectedPresetIds;
	}

	return enabled
		? Array.from(new Set([
			...selectedPresetIds,
			flagPreset.id,
		]))
		: selectedPresetIds.filter((presetId) => presetId !== flagPreset.id);
}

export function replaceDownloadSearchCategoryPreset(
	builderState: DownloadSearchBuilderState,
	presets: DownloadSearchKeywordPreset[],
	category: DownloadSearchKeywordCategory,
	nextPresetId: string | undefined,
): DownloadSearchBuilderState {
	return {
		...builderState,
		selectedPresetIds: replaceDownloadSearchCategoryPresetId(
			presets,
			builderState.selectedPresetIds,
			category,
			nextPresetId,
		),
	};
}

export function replaceDownloadSearchAudioCodecPreset(
	builderState: DownloadSearchBuilderState,
	presets: DownloadSearchKeywordPreset[],
	nextPresetId: string | undefined,
): DownloadSearchBuilderState {
	return {
		...builderState,
		selectedPresetIds: replaceDownloadSearchAudioCodecPresetId(
			presets,
			builderState.selectedPresetIds,
			nextPresetId,
		),
	};
}

export function toggleDownloadSearchAudioFlagPreset(
	builderState: DownloadSearchBuilderState,
	presets: DownloadSearchKeywordPreset[],
	value: string,
	enabled: boolean,
): DownloadSearchBuilderState {
	return {
		...builderState,
		selectedPresetIds: toggleDownloadSearchAudioFlagPresetId(
			presets,
			builderState.selectedPresetIds,
			value,
			enabled,
		),
	};
}

export function setDownloadSearchBuilderTitleLanguage(
	builderState: DownloadSearchBuilderState,
	titleLanguage: DownloadSearchTitleLanguage,
): DownloadSearchBuilderState {
	return {
		...builderState,
		titleLanguage,
	};
}

export function setDownloadSearchBuilderCustomQueryText(
	builderState: DownloadSearchBuilderState,
	customQueryText: string,
): DownloadSearchBuilderState {
	return {
		...builderState,
		customQueryText,
	};
}

export function createDownloadSearchTitleDraftForLanguage(
	media: MediaDownloadInspection,
	titleLanguage: DownloadSearchTitleLanguage,
): string | null {
	if (!media) {
		return null;
	}

	return resolveDownloadSearchTitle(
		media.titleOptions,
		media.name,
		titleLanguage,
	);
}

export function createDownloadSearchBuilderStateSaveRequest(
	mediaId: number,
	builderState: DownloadSearchBuilderState,
	lastUsedProviderId?: string,
) {
	return lastUsedProviderId
		? {
			...builderState,
			mediaId,
			lastUsedProviderId,
		}
		: {
			...builderState,
			mediaId,
		};
}
