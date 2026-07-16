import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
} from "@nimlat/types/download-search";
import Checkbox from "antd/es/checkbox";
import Select from "antd/es/select";
import type { FC } from "react";
import {
	createDownloadSearchAudioCodecOptions,
	createDownloadSearchPresetOptions,
	getSelectedDownloadSearchAudioCodecId,
	getSelectedDownloadSearchPresetId,
	isDownloadSearchAudioFlagSelected,
} from "./media-download-explorer.utils";
import type {
	DownloadPresetBuilderField,
	DownloadPresetBuilderFieldGroup,
} from "./media-download-preset-builder-model";
import styles from "./MediaDownloadPresetBuilder.module.css";

interface MediaDownloadPresetFieldGroupProps {
	builderState: DownloadSearchBuilderState;
	fieldGroup: DownloadPresetBuilderFieldGroup;
	presets: DownloadSearchKeywordPreset[];
	onReplaceAudioCodec: (nextPresetId: string | undefined) => void;
	onReplaceCategoryPreset: (category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => void;
	onToggleAudioFlag: (value: string, enabled: boolean) => void;
}

function renderBuilderField({
															builderState,
															field,
															presets,
															onReplaceAudioCodec,
															onReplaceCategoryPreset,
														}: {
	builderState: DownloadSearchBuilderState;
	field: DownloadPresetBuilderField;
	presets: DownloadSearchKeywordPreset[];
	onReplaceAudioCodec: (nextPresetId: string | undefined) => void;
	onReplaceCategoryPreset: (category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => void;
}) {
	if (field.kind === "audioCodec") {
		return (
			<Select
				key={ field.placeholder }
				allowClear
				placeholder={ field.placeholder }
				value={ getSelectedDownloadSearchAudioCodecId(
					presets,
					builderState.selectedPresetIds,
				) }
				options={ createDownloadSearchAudioCodecOptions(presets) }
				onChange={ onReplaceAudioCodec }
			/>
		);
	}

	return (
		<Select
			key={ field.category }
			allowClear
			placeholder={ field.placeholder }
			value={ getSelectedDownloadSearchPresetId(
				presets,
				builderState.selectedPresetIds,
				field.category,
			) }
			options={ createDownloadSearchPresetOptions(
				presets,
				field.category,
			) }
			onChange={ (presetId) => onReplaceCategoryPreset(
				field.category,
				presetId,
			) }
		/>
	);
}

const MediaDownloadPresetFieldGroup: FC<MediaDownloadPresetFieldGroupProps> = ({
																																								 builderState,
																																								 fieldGroup,
																																								 presets,
																																								 onReplaceAudioCodec,
																																								 onReplaceCategoryPreset,
																																								 onToggleAudioFlag,
																																							 }) => (
	<div className={ styles.fieldGroup }>
		<div className={ styles.fieldLabel }>{ fieldGroup.title }</div>
		{ fieldGroup.fields.map(field => renderBuilderField({
			builderState,
			field,
			presets,
			onReplaceAudioCodec,
			onReplaceCategoryPreset,
		})) }
		{ fieldGroup.audioFlagValues?.map((value) => (
			<Checkbox
				key={ value }
				checked={ isDownloadSearchAudioFlagSelected(
					presets,
					builderState.selectedPresetIds,
					value,
				) }
				onChange={ (event) => onToggleAudioFlag(
					value,
					event.target.checked,
				) }
			>
				{ value }
			</Checkbox>
		)) }
	</div>
);

export default MediaDownloadPresetFieldGroup;
