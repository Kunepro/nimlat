import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import Button from "antd/es/button";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import Checkbox from "antd/es/checkbox";
import Select from "antd/es/select";
import type { FC } from "react";
import styles from "../PreferencesModal.module.css";

interface PreferencesGeneralSectionProps {
	backgroundStyle: BackgroundStyle;
	isAdultContentEnabled: boolean;
	preferredTitleLanguage: PreferredTitleLanguage;
	onAdultToggle: (event: CheckboxChangeEvent) => void;
	onBackgroundStyleChange: (style: BackgroundStyle) => void;
	onOpenIgnoredContent: () => void;
	onPreferredTitleLanguageChange: (language: PreferredTitleLanguage) => void;
}

const PreferencesGeneralSection: FC<PreferencesGeneralSectionProps> = ({
																																				 backgroundStyle,
																																				 isAdultContentEnabled,
																																				 preferredTitleLanguage,
																																				 onAdultToggle,
																																				 onBackgroundStyleChange,
																																				 onOpenIgnoredContent,
																																				 onPreferredTitleLanguageChange,
																																			 }) => (
	<>
		<div className={ styles.settingRow }>
			<div className={ styles.settingCopy }>
				<div className={ styles.settingLabel }>18+ content</div>
				<div className={ styles.settingHint }>
					Show titles marked as adult content.
				</div>
			</div>
			<Checkbox
				checked={ isAdultContentEnabled }
				onChange={ onAdultToggle }
			/>
		</div>
		<div className={ styles.settingRow }>
			<div className={ styles.settingCopy }>
				<div className={ styles.settingLabel }>Background</div>
				<div className={ styles.settingHint }>
					Choose the app background.
				</div>
			</div>
			<Select<BackgroundStyle>
				className={ styles.backgroundSelect }
				value={ backgroundStyle }
				options={ [
					{
						value: "synthwave",
						label: "Synthwave",
					},
					{
						value: "kanaMatrix",
						label: "Kana matrix",
					},
					{
						value: "kanaGrid",
						label: "Kana grid",
					},
					{
						value: "staticDarkBlue",
						label: "Static dark blue",
					},
				] }
				onChange={ onBackgroundStyleChange }
			/>
		</div>
		<div className={ styles.settingRow }>
			<div className={ styles.settingCopy }>
				<div className={ styles.settingLabel }>Title language</div>
				<div className={ styles.settingHint }>
					Choose which anime and episode title variant is shown when no custom title exists.
				</div>
			</div>
			<Select<PreferredTitleLanguage>
				className={ styles.backgroundSelect }
				value={ preferredTitleLanguage }
				options={ [
					{
						value: "english",
						label: "English",
					},
					{
						value: "romaji",
						label: "Romaji",
					},
					{
						value: "native",
						label: "Japanese",
					},
				] }
				onChange={ onPreferredTitleLanguageChange }
			/>
		</div>
		<div className={ styles.settingRow }>
			<div className={ styles.settingCopy }>
				<div className={ styles.settingLabel }>Ignored content</div>
				<div className={ styles.settingHint }>
					Open the separate page that lists items hidden from the main Library.
				</div>
			</div>
			<Button onClick={ onOpenIgnoredContent }>
				Show ignored
			</Button>
		</div>
	</>
);

export default PreferencesGeneralSection;
