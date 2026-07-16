import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	DownloadSearchSettings,
} from "@nimlat/types/download-search";
import type { MediaDownloadInspection } from "../../../types/media-download";
import {
	createCurrentDownloadSearchBuilderQuery,
	resolveDownloadSearchTitle,
} from "./media-download-explorer.utils";

export const DEFAULT_DOWNLOAD_SEARCH_BUILDER_STATE: DownloadSearchBuilderState = {
	titleLanguage:     "english",
	selectedPresetIds: [],
	customQueryText:   "",
};

export interface DownloadSearchSettingsSnapshot {
	providers: DownloadSearchProvider[];
	presets: DownloadSearchKeywordPreset[];
	queryPresets: DownloadSearchQueryPreset[];
}

export interface MediaDownloadInitialStateSnapshot extends DownloadSearchSettingsSnapshot {
	builderState: DownloadSearchBuilderState;
	media: MediaDownloadInspection;
	titleDraft: string;
}

export interface MediaDownloadExplorerDerivedState {
	activeQueryPresets: DownloadSearchQueryPreset[];
	currentQueryPreview: string;
	enabledProviders: DownloadSearchProvider[];
	selectedPresets: DownloadSearchKeywordPreset[];
	title: string;
}

export function getEnabledDownloadSearchProviders(providers: DownloadSearchProvider[]): DownloadSearchProvider[] {
	return providers.filter((provider) => provider.enabled);
}

export function getEnabledDownloadSearchKeywordPresets(presets: DownloadSearchKeywordPreset[]): DownloadSearchKeywordPreset[] {
	return presets.filter((preset) => preset.enabled);
}

export function getActiveDownloadSearchQueryPresets(presets: DownloadSearchQueryPreset[]): DownloadSearchQueryPreset[] {
	return presets.filter((preset) => preset.enabled);
}

export function getSelectedDownloadSearchPresets(
	presets: DownloadSearchKeywordPreset[],
	selectedPresetIds: string[],
): DownloadSearchKeywordPreset[] {
	return presets.filter((preset) => selectedPresetIds.includes(preset.id));
}

function resolveMediaDownloadTitle(
	media: MediaDownloadInspection,
	titleDraft: string,
	builderState: DownloadSearchBuilderState,
): string {
	if (!media) {
		return "";
	}

	return titleDraft.trim() || resolveDownloadSearchTitle(
		media.titleOptions,
		media.name,
		builderState.titleLanguage,
	);
}

function createInitialDownloadSearchTitleDraft(
	media: MediaDownloadInspection,
	builderState: DownloadSearchBuilderState,
): string {
	return media
		? resolveDownloadSearchTitle(
			media.titleOptions,
			media.name,
			builderState.titleLanguage,
		)
		: "";
}

export function createDownloadSearchSettingsSnapshot(settings: DownloadSearchSettings): DownloadSearchSettingsSnapshot {
	// Disabled keyword presets are preference state, not active builder choices.
	// Keep this projection centralized so refresh and initial load stay identical.
	return {
		providers:    settings.providers,
		presets:      getEnabledDownloadSearchKeywordPresets(settings.keywordPresets),
		queryPresets: settings.queryPresets,
	};
}

export function createMediaDownloadInitialStateSnapshot(
	media: MediaDownloadInspection,
	settings: DownloadSearchSettings,
): MediaDownloadInitialStateSnapshot {
	return {
		...createDownloadSearchSettingsSnapshot(settings),
		builderState: settings.builderState,
		media,
		titleDraft:   createInitialDownloadSearchTitleDraft(
			media,
			settings.builderState,
		),
	};
}

export function createMediaDownloadExplorerDerivedState({
																													builderState,
																													media,
																													presets,
																													providers,
																													queryPresets,
																													titleDraft,
																												}: {
	builderState: DownloadSearchBuilderState;
	media: MediaDownloadInspection;
	presets: DownloadSearchKeywordPreset[];
	providers: DownloadSearchProvider[];
	queryPresets: DownloadSearchQueryPreset[];
	titleDraft: string;
}): MediaDownloadExplorerDerivedState {
	const selectedPresets = getSelectedDownloadSearchPresets(
		presets,
		builderState.selectedPresetIds,
	);
	const title           = resolveMediaDownloadTitle(
		media,
		titleDraft,
		builderState,
	);

	return {
		activeQueryPresets:  getActiveDownloadSearchQueryPresets(queryPresets),
		currentQueryPreview: createCurrentDownloadSearchBuilderQuery(
			title,
			selectedPresets,
			builderState.customQueryText,
		),
		enabledProviders:    getEnabledDownloadSearchProviders(providers),
		selectedPresets,
		title,
	};
}
