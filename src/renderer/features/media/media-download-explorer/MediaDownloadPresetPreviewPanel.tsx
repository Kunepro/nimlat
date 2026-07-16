import Button from "antd/es/button";
import Input from "antd/es/input";
import type { FC } from "react";
import styles from "./MediaDownloadPresetBuilder.module.css";

interface MediaDownloadPresetPreviewPanelProps {
	currentQueryPreview: string;
	presetLabelDraft: string;
	onCreateQueryPreset: () => void;
	onPresetLabelChange: (value: string) => void;
}

const MediaDownloadPresetPreviewPanel: FC<MediaDownloadPresetPreviewPanelProps> = ({
																																										 currentQueryPreview,
																																										 presetLabelDraft,
																																										 onCreateQueryPreset,
																																										 onPresetLabelChange,
																																									 }) => (
	<div className={ styles.previewPanel }>
		<div className={ styles.previewGrid }>
			<div className={ styles.previewField }>
				<div className={ styles.fieldLabel }>Preset name</div>
				<Input
					value={ presetLabelDraft }
					placeholder="Preset name"
					onChange={ (event) => onPresetLabelChange(event.target.value) }
				/>
			</div>
			<div className={ styles.previewField }>
				<div className={ styles.fieldLabel }>Search preview</div>
				<div className={ styles.queryPreview }>{ currentQueryPreview }</div>
			</div>
		</div>
		<div className={ styles.generatePresetRow }>
			<Button
				type="primary"
				onClick={ onCreateQueryPreset }
			>
				Add preset
			</Button>
		</div>
	</div>
);

export default MediaDownloadPresetPreviewPanel;
