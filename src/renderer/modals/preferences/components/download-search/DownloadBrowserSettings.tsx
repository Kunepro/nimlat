import type {
	DownloadBrowserConfig,
	DownloadBrowserMode,
} from "@nimlat/types/download-search";
import {
	Button,
	Input,
	Radio,
	Space,
} from "antd";
import type { FC } from "react";
import styles from "../../PreferencesModal.module.css";

interface DownloadBrowserSettingsProps {
	browserDraft: DownloadBrowserConfig;
	customPath: string;
	onBrowserModeChange: (mode: DownloadBrowserMode) => void;
	onCustomPathChange: (path: string) => void;
	onPickExecutable: () => void;
	onRevertChanges: () => void;
	onSaveChanges: () => void;
}

const DownloadBrowserSettings: FC<DownloadBrowserSettingsProps> = ({
																																		 browserDraft,
																																		 customPath,
																																		 onBrowserModeChange,
																																		 onCustomPathChange,
																																		 onPickExecutable,
																																		 onRevertChanges,
																																		 onSaveChanges,
																																	 }) => (
	<>
		<div className={ styles.settingDivider }/>
		<div className={ styles.settingCopy }>
			<div className={ styles.settingLabel }>Default browser</div>
		</div>
		<Radio.Group
			value={ browserDraft.mode }
			onChange={ (event) => onBrowserModeChange(event.target.value as DownloadBrowserMode) }
		>
			<Radio value="system">Use default browser</Radio>
			<Radio value="custom">Use custom browser executable</Radio>
		</Radio.Group>
		<Space.Compact block>
			<Input
				value={ customPath }
				placeholder="Browser executable path"
				onChange={ (event) => onCustomPathChange(event.target.value) }
				onPressEnter={ onSaveChanges }
			/>
			<Button onClick={ onPickExecutable }>
				Browse
			</Button>
		</Space.Compact>
		<Space>
			<Button onClick={ onRevertChanges }>
				Revert changes
			</Button>
			<Button
				type="primary"
				onClick={ onSaveChanges }
			>
				Save changes
			</Button>
		</Space>
	</>
);

export default DownloadBrowserSettings;
