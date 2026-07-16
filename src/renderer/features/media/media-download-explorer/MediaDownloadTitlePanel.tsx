import {
	DownloadSearchBuilderState,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";
import Input from "antd/es/input";
import Select from "antd/es/select";
import { FC } from "react";
import type { MediaDownloadInspection } from "../../../types/media-download";
import { createDownloadSearchTitleOptions } from "./media-download-explorer.utils";
import styles from "./MediaDownloadTitlePanel.module.css";

interface MediaDownloadTitlePanelProps {
	media: NonNullable<MediaDownloadInspection>;
	builderState: DownloadSearchBuilderState;
	titleDraft: string;
	onTitleLanguageChange: (titleLanguage: DownloadSearchTitleLanguage) => void;
	onTitleDraftChange: (value: string) => void;
}

const MediaDownloadTitlePanel: FC<MediaDownloadTitlePanelProps> = ({
																																		 media,
																																		 builderState,
																																		 titleDraft,
																																		 onTitleLanguageChange,
																																		 onTitleDraftChange,
																																	 }) => (
	<div className={ styles.compactPanel }>
		<div className={ styles.titleRow }>
			<div className={ styles.fieldLabel }>Title</div>
			<Select
				value={ builderState.titleLanguage }
				options={ createDownloadSearchTitleOptions(
					media.titleOptions,
					media.name,
				) }
				onChange={ onTitleLanguageChange }
			/>
			<Input
				value={ titleDraft }
				placeholder="Search title"
				onChange={ (event) => onTitleDraftChange(event.target.value) }
			/>
		</div>
	</div>
);

export default MediaDownloadTitlePanel;
