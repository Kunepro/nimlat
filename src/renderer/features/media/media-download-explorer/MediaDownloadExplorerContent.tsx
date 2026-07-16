import Alert from "antd/es/alert";
import type { MediaDownloadExplorerReadyState } from "./media-download-explorer-state-types";
import MediaDownloadPresetBuilder from "./MediaDownloadPresetBuilder";
import MediaDownloadProviderGrid from "./MediaDownloadProviderGrid";
import MediaDownloadQueryPresetList from "./MediaDownloadQueryPresetList";
import MediaDownloadStatusAction from "./MediaDownloadStatusAction";
import MediaDownloadTitlePanel from "./MediaDownloadTitlePanel";

interface MediaDownloadExplorerContentProps {
	state: MediaDownloadExplorerReadyState;
}

export default function MediaDownloadExplorerContent({
																											 state,
																										 }: MediaDownloadExplorerContentProps) {
	const {
					actionError,
					activeQueryPresets,
					builderState,
					currentQueryPreview,
					enabledProviders,
					isSettingDownloading,
					media,
					numericMediaId,
					presetLabelDraft,
					presets,
					queryPresets,
					title,
					titleDraft,
					createQueryPreset,
					deleteQueryPreset,
					openProviderPresets,
					replaceAudioCodec,
					replaceCategoryPreset,
					setCustomQueryText,
					setMediaDownloading,
					setPresetLabelDraft,
					setTitleDraft,
					setTitleLanguage,
					toggleAudioFlag,
					toggleQueryPreset,
				} = state;

	return (
		<>
			{ actionError ? (
				<Alert
					type="error"
					message={ actionError }
					showIcon
				/>
			) : null }
			<MediaDownloadTitlePanel
				media={ media }
				builderState={ builderState }
				titleDraft={ titleDraft }
				onTitleLanguageChange={ setTitleLanguage }
				onTitleDraftChange={ setTitleDraft }
			/>
			<MediaDownloadPresetBuilder
				presets={ presets }
				builderState={ builderState }
				presetLabelDraft={ presetLabelDraft }
				currentQueryPreview={ currentQueryPreview }
				onReplaceCategoryPreset={ replaceCategoryPreset }
				onReplaceAudioCodec={ replaceAudioCodec }
				onToggleAudioFlag={ toggleAudioFlag }
				onCustomQueryTextChange={ setCustomQueryText }
				onPresetLabelChange={ setPresetLabelDraft }
				onCreateQueryPreset={ () => void createQueryPreset() }
			/>
			<MediaDownloadQueryPresetList
				title={ title }
				presets={ presets }
				queryPresets={ queryPresets }
				onToggleQueryPreset={ toggleQueryPreset }
				onDeleteQueryPreset={ presetId => void deleteQueryPreset(presetId) }
			/>
			<MediaDownloadProviderGrid
				providers={ enabledProviders }
				activeQueryPresets={ activeQueryPresets }
				onOpenProviderPresets={ (provider, targetPresets) => void openProviderPresets(
					provider,
					targetPresets,
				) }
			/>
			<MediaDownloadStatusAction
				mediaId={ numericMediaId }
				integrationStatus={ media.integrationStatus ?? null }
				isSettingDownloading={ isSettingDownloading }
				onSetDownloading={ () => void setMediaDownloading() }
			/>
		</>
	);
}
