import { useParams } from "@tanstack/react-router";
import {
	useMemo,
	useState,
} from "react";
import { useDownloadSearchBuilderActions } from "./hooks/useDownloadSearchBuilderActions";
import { useDownloadSearchPresetLabelDraft } from "./hooks/useDownloadSearchPresetLabelDraft";
import { useDownloadSearchProviderActions } from "./hooks/useDownloadSearchProviderActions";
import { useDownloadSearchQueryPresetActions } from "./hooks/useDownloadSearchQueryPresetActions";
import { useDownloadSearchSettingsState } from "./hooks/useDownloadSearchSettingsState";
import { useMediaDownloadStatusAction } from "./hooks/useMediaDownloadStatusAction";
import type { MediaDownloadExplorerState } from "./media-download-explorer-state-types";
import { createMediaDownloadExplorerDerivedState } from "./media-download-settings-model";

export function useMediaDownloadExplorerState(): MediaDownloadExplorerState {
	const { mediaId = "" }                = useParams({ strict: false });
	const numericMediaId                  = Number(mediaId);
	const [ actionError, setActionError ] = useState<string | null>(null);
	const {
					builderState,
					errorMessage,
					isLoading,
					media,
					presets,
					providers,
					queryPresets,
					titleDraft,
					setBuilderState,
					setMedia,
					setQueryPresets,
					setTitleDraft,
				}                               = useDownloadSearchSettingsState(
		numericMediaId,
		setActionError,
	);

	const {
					activeQueryPresets,
					currentQueryPreview,
					enabledProviders,
					selectedPresets,
					title,
				}                       = useMemo(
		() => createMediaDownloadExplorerDerivedState({
			builderState,
			media,
			presets,
			providers,
			queryPresets,
			titleDraft,
		}),
		[
			builderState,
			media,
			presets,
			providers,
			queryPresets,
			titleDraft,
		],
	);
	const {
					presetLabelDraft,
					setPresetLabelDraft,
				}                       = useDownloadSearchPresetLabelDraft(
		selectedPresets,
		builderState,
	);
	const {
					replaceAudioCodec,
					replaceCategoryPreset,
					setCustomQueryText,
					setTitleLanguage,
					toggleAudioFlag,
				}                       = useDownloadSearchBuilderActions({
		media,
		presets,
		setBuilderState,
		setTitleDraft,
	});
	const {
					createQueryPreset,
					deleteQueryPreset,
					toggleQueryPreset,
				}                       = useDownloadSearchQueryPresetActions({
		builderState,
		presetLabelDraft,
		selectedPresets,
		setActionError,
		setQueryPresets,
	});
	const { openProviderPresets } = useDownloadSearchProviderActions({
		builderState,
		numericMediaId,
		presets,
		title,
		setActionError,
	});
	const {
					isSettingDownloading,
					setMediaDownloading,
				}                       = useMediaDownloadStatusAction(
		numericMediaId,
		setMedia,
		setActionError,
	);

	return {
		numericMediaId,
		media,
		presets,
		queryPresets,
		activeQueryPresets,
		enabledProviders,
		builderState,
		titleDraft,
		title,
		currentQueryPreview,
		presetLabelDraft,
		isLoading,
		errorMessage,
		actionError,
		isSettingDownloading,
		setTitleLanguage,
		setTitleDraft,
		setCustomQueryText,
		setPresetLabelDraft,
		replaceCategoryPreset,
		replaceAudioCodec,
		toggleAudioFlag,
		createQueryPreset,
		toggleQueryPreset,
		deleteQueryPreset,
		openProviderPresets,
		setMediaDownloading,
	};
}
