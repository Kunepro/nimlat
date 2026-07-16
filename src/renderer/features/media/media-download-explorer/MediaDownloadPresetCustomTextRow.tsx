import Input from "antd/es/input";
import type { FC } from "react";
import styles from "./MediaDownloadPresetBuilder.module.css";

interface MediaDownloadPresetCustomTextRowProps {
	customQueryText: string;
	onCustomQueryTextChange: (value: string) => void;
}

const MediaDownloadPresetCustomTextRow: FC<MediaDownloadPresetCustomTextRowProps> = ({
																																											 customQueryText,
																																											 onCustomQueryTextChange,
																																										 }) => (
	<div className={ styles.customTextRow }>
		<div className={ styles.fieldLabel }>Custom</div>
		<Input
			value={ customQueryText }
			placeholder="Custom search text"
			onChange={ (event) => onCustomQueryTextChange(event.target.value) }
		/>
	</div>
);

export default MediaDownloadPresetCustomTextRow;
