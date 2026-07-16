import {
	useEffect,
	useState,
} from "react";
import { useDownloadSearchPreferencesPersistence } from "./hooks/useDownloadSearchPreferencesPersistence";
import { usePreferencesGeneralSettings } from "./hooks/usePreferencesGeneralSettings";
import { usePreferencesInitialSettingsLoad } from "./hooks/usePreferencesInitialSettingsLoad";
import { usePreferencesNavigation } from "./hooks/usePreferencesNavigation";
import type { PreferenceSection } from "./preferences-modal-model";
import {
	useClosePreferencesModal,
	usePreferencesModalState,
} from "./preferences-modal.state";

export function usePreferencesModalController() {
	const [ modalState, setModalState ]       = usePreferencesModalState();
	const [ activeSection, setActiveSection ] = useState<PreferenceSection>("general");
	const closePreferencesModal               = useClosePreferencesModal();
	const {
					isAdultConfirmOpen,
					handleAdultToggle,
					handleBackgroundStyleChange,
					handleCanvasDiagnosticsToggle,
					handlePreferredTitleLanguageChange,
					persistAdultContentStatus,
					setAdultConfirmOpen,
				}                                   = usePreferencesGeneralSettings(
		modalState,
		setModalState,
	);
	const {
					createDownloadProvider,
					deleteDownloadProvider,
					handleProviderToggle,
					pickDownloadBrowserExecutable,
					saveDownloadBrowserConfig,
					startEditingDownloadProvider,
					cancelEditingDownloadProvider,
					updateDownloadProvider,
				}                                   = useDownloadSearchPreferencesPersistence(
		modalState,
		setModalState,
	);
	const {
					openAnimeDbDownload,
					openAnimeDbScanner,
					openIgnoredContent,
				}                                   = usePreferencesNavigation({ closePreferencesModal });

	usePreferencesInitialSettingsLoad(
		modalState.isOpen,
		setModalState,
	);

	useEffect(
		() => {
			if (!modalState.isDevModeEnabled && activeSection === "developers") {
				setActiveSection("general");
			}
		},
		[
			activeSection,
			modalState.isDevModeEnabled,
		],
	);

	return {
		activeSection,
		cancelEditingDownloadProvider,
		closePreferencesModal,
		createDownloadProvider,
		deleteDownloadProvider,
		handleAdultToggle,
		handleBackgroundStyleChange,
		handleCanvasDiagnosticsToggle,
		handlePreferredTitleLanguageChange,
		handleProviderToggle,
		isAdultConfirmOpen,
		modalState,
		openAnimeDbDownload,
		openAnimeDbScanner,
		openIgnoredContent,
		persistAdultContentStatus,
		pickDownloadBrowserExecutable,
		saveDownloadBrowserConfig,
		setActiveSection,
		setAdultConfirmOpen,
		setModalState,
		startEditingDownloadProvider,
		updateDownloadProvider,
	};
}

export type PreferencesModalController = ReturnType<typeof usePreferencesModalController>;
