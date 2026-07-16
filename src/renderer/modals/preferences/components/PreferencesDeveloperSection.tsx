import type { CheckboxChangeEvent } from "antd/es/checkbox";
import Checkbox from "antd/es/checkbox";
import type { FC } from "react";
import styles from "../PreferencesModal.module.css";

interface PreferencesDeveloperSectionProps {
	isCanvasDiagnosticsEnabled: boolean;
	onCanvasDiagnosticsToggle: (event: CheckboxChangeEvent) => void;
}

const PreferencesDeveloperSection: FC<PreferencesDeveloperSectionProps> = ({
																																						 isCanvasDiagnosticsEnabled,
																																						 onCanvasDiagnosticsToggle,
																																					 }) => (
	<div className={ styles.settingColumn }>
		<div className={ styles.settingRow }>
			<div className={ styles.settingCopy }>
				<div className={ styles.settingLabel }>Canvas diagnostics</div>
				<div className={ styles.settingHint }>
					Show the media-wall render diagnostics overlay for Pixi canvas lists.
				</div>
			</div>
			<Checkbox
				checked={ isCanvasDiagnosticsEnabled }
				onChange={ onCanvasDiagnosticsToggle }
			/>
		</div>
	</div>
);

export default PreferencesDeveloperSection;
