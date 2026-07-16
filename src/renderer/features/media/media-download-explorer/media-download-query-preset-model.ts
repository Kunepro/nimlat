import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import { createDownloadSearchQueryPresetLabel } from "./media-download-explorer.utils";

function createDownloadSearchQueryPresetDraftLabel(
	selectedPresets: DownloadSearchKeywordPreset[],
	customQueryText: string,
	presetLabelDraft: string,
): string {
	const generatedLabel = createDownloadSearchQueryPresetLabel(
		selectedPresets,
		customQueryText,
	);
	return presetLabelDraft.trim().length > 0 ? presetLabelDraft : generatedLabel;
}

export function createDownloadSearchQueryPresetRequest(
	selectedPresets: DownloadSearchKeywordPreset[],
	builderState: DownloadSearchBuilderState,
	presetLabelDraft: string,
) {
	return {
		label:             createDownloadSearchQueryPresetDraftLabel(
			selectedPresets,
			builderState.customQueryText,
			presetLabelDraft,
		),
		selectedPresetIds: builderState.selectedPresetIds,
		customQueryText:   builderState.customQueryText,
	};
}

export function setDownloadSearchQueryPresetEnabled(
	presets: DownloadSearchQueryPreset[],
	presetId: string,
	enabled: boolean,
): DownloadSearchQueryPreset[] {
	return presets.map((preset) => preset.id === presetId
		? {
			...preset,
			enabled,
		}
		: preset);
}

export function rollbackDownloadSearchQueryPresetEnabled(
	presets: DownloadSearchQueryPreset[],
	presetId: string,
	failedEnabled: boolean,
): DownloadSearchQueryPreset[] {
	// Only rollback the failed optimistic value so a later user toggle is not
	// overwritten by an older rejection.
	return presets.map((preset) => preset.id === presetId && preset.enabled === failedEnabled
		? {
			...preset,
			enabled: !failedEnabled,
		}
		: preset);
}

export function removeDownloadSearchQueryPreset(
	presets: DownloadSearchQueryPreset[],
	presetId: string,
): DownloadSearchQueryPreset[] {
	return presets.filter((preset) => preset.id !== presetId);
}
