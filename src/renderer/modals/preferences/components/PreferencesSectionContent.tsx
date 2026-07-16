import type { FC } from "react";
import type { PreferencesModalController } from "../usePreferencesModalController";
import AppUpdatePreferencesSection from "./AppUpdatePreferencesSection";
import { DownloadSearchPreferencesSection } from "./DownloadSearchPreferencesSection";
import ExternalTrackingPreferencesSection from "./ExternalTrackingPreferencesSection";
import PreferencesDeveloperSection from "./PreferencesDeveloperSection";
import PreferencesGeneralSection from "./PreferencesGeneralSection";

interface PreferencesSectionContentProps {
	controller: PreferencesModalController;
}

const PreferencesSectionContent: FC<PreferencesSectionContentProps> = ({ controller }) => {
	const {
					activeSection,
					cancelEditingDownloadProvider,
					createDownloadProvider,
					deleteDownloadProvider,
					handleAdultToggle,
					handleBackgroundStyleChange,
					handleCanvasDiagnosticsToggle,
					handlePreferredTitleLanguageChange,
					handleProviderToggle,
					modalState,
					openAnimeDbDownload,
					openAnimeDbScanner,
					openIgnoredContent,
					pickDownloadBrowserExecutable,
					saveDownloadBrowserConfig,
					setModalState,
					startEditingDownloadProvider,
					updateDownloadProvider,
				} = controller;

	if (activeSection === "general") {
		return (
			<PreferencesGeneralSection
				backgroundStyle={ modalState.backgroundStyle }
				isAdultContentEnabled={ modalState.isAdultContentEnabled }
				preferredTitleLanguage={ modalState.preferredTitleLanguage }
				onAdultToggle={ handleAdultToggle }
				onBackgroundStyleChange={ handleBackgroundStyleChange }
				onOpenIgnoredContent={ openIgnoredContent }
				onPreferredTitleLanguageChange={ handlePreferredTitleLanguageChange }
			/>
		);
	}

	if (activeSection === "tracking") {
		return <ExternalTrackingPreferencesSection/>;
	}

	if (activeSection === "download") {
		return (
			<DownloadSearchPreferencesSection
				cancelEditingDownloadProvider={ cancelEditingDownloadProvider }
				createDownloadProvider={ createDownloadProvider }
				deleteDownloadProvider={ deleteDownloadProvider }
				handleProviderToggle={ handleProviderToggle }
				modalState={ modalState }
				pickDownloadBrowserExecutable={ pickDownloadBrowserExecutable }
				saveDownloadBrowserConfig={ saveDownloadBrowserConfig }
				setModalState={ setModalState }
				startEditingDownloadProvider={ startEditingDownloadProvider }
				updateDownloadProvider={ updateDownloadProvider }
			/>
		);
	}

	if (activeSection === "app") {
		return (
			<AppUpdatePreferencesSection
				isPreferencesOpen={ modalState.isOpen }
				onOpenAnimeDbDownload={ openAnimeDbDownload }
				onOpenAnimeDbScanner={ openAnimeDbScanner }
			/>
		);
	}

	return (
		<PreferencesDeveloperSection
			isCanvasDiagnosticsEnabled={ modalState.isCanvasDiagnosticsEnabled }
			onCanvasDiagnosticsToggle={ handleCanvasDiagnosticsToggle }
		/>
	);
};

export default PreferencesSectionContent;
