import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
} from "@nimlat/types/download-search";
import type { FC } from "react";
import { DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS } from "./media-download-preset-builder-model";
import styles from "./MediaDownloadPresetBuilder.module.css";
import MediaDownloadPresetCustomTextRow from "./MediaDownloadPresetCustomTextRow";
import MediaDownloadPresetFieldGroup from "./MediaDownloadPresetFieldGroup";
import MediaDownloadPresetPreviewPanel from "./MediaDownloadPresetPreviewPanel";

interface MediaDownloadPresetBuilderProps {
	presets: DownloadSearchKeywordPreset[];
	builderState: DownloadSearchBuilderState;
	presetLabelDraft: string;
	currentQueryPreview: string;
	onReplaceCategoryPreset: (category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => void;
	onReplaceAudioCodec: (nextPresetId: string | undefined) => void;
	onToggleAudioFlag: (value: string, enabled: boolean) => void;
	onCustomQueryTextChange: (value: string) => void;
	onPresetLabelChange: (value: string) => void;
	onCreateQueryPreset: () => void;
}

const MediaDownloadPresetBuilder: FC<MediaDownloadPresetBuilderProps> = ({
																																					 presets,
																																					 builderState,
																																					 presetLabelDraft,
																																					 currentQueryPreview,
																																					 onReplaceCategoryPreset,
																																					 onReplaceAudioCodec,
																																					 onToggleAudioFlag,
																																					 onCustomQueryTextChange,
																																					 onPresetLabelChange,
																																					 onCreateQueryPreset,
																																				 }) => (
	<div className={ styles.builderStack }>
		<div className={ styles.compactPanel }>
			{ DOWNLOAD_PRESET_BUILDER_FIELD_GROUPS.map(fieldGroup => (
				<MediaDownloadPresetFieldGroup
					key={ fieldGroup.title }
					builderState={ builderState }
					fieldGroup={ fieldGroup }
					presets={ presets }
					onReplaceAudioCodec={ onReplaceAudioCodec }
					onReplaceCategoryPreset={ onReplaceCategoryPreset }
					onToggleAudioFlag={ onToggleAudioFlag }
				/>
			)) }
			<MediaDownloadPresetCustomTextRow
				customQueryText={ builderState.customQueryText }
				onCustomQueryTextChange={ onCustomQueryTextChange }
			/>
		</div>
		<MediaDownloadPresetPreviewPanel
			currentQueryPreview={ currentQueryPreview }
			presetLabelDraft={ presetLabelDraft }
			onCreateQueryPreset={ onCreateQueryPreset }
			onPresetLabelChange={ onPresetLabelChange }
		/>
	</div>
);

export default MediaDownloadPresetBuilder;
