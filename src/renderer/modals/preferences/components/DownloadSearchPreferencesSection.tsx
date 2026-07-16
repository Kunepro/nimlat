import type {
	Dispatch,
	SetStateAction,
} from "react";
import type { PreferencesModalState } from "../../../types/modals";
import { useDownloadSearchPreferencesActions } from "../hooks/useDownloadSearchPreferencesActions";
import styles from "../PreferencesModal.module.css";
import DownloadBrowserSettings from "./download-search/DownloadBrowserSettings";
import DownloadProvidersSettings from "./download-search/DownloadProvidersSettings";

type DownloadSearchPreferencesSectionProps = {
	cancelEditingDownloadProvider: () => void;
	createDownloadProvider: () => void;
	deleteDownloadProvider: (providerId: string) => void;
	handleProviderToggle: (providerId: string, enabled: boolean) => void;
	modalState: PreferencesModalState;
	pickDownloadBrowserExecutable: () => void;
	saveDownloadBrowserConfig: () => void;
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>;
	startEditingDownloadProvider: (providerId: string) => void;
	updateDownloadProvider: () => void;
};

export function DownloadSearchPreferencesSection({
																									 cancelEditingDownloadProvider,
																									 createDownloadProvider,
																									 deleteDownloadProvider,
																									 handleProviderToggle,
																									 modalState,
																									 pickDownloadBrowserExecutable,
																									 saveDownloadBrowserConfig,
																									 setModalState,
																									 startEditingDownloadProvider,
																									 updateDownloadProvider,
																								 }: DownloadSearchPreferencesSectionProps) {
	const {
					cancelAddingDownloadProvider,
					revertBrowserChanges,
					toggleAddingDownloadProvider,
					updateBrowserCustomPath,
					updateBrowserMode,
					updateEditDownloadProvider,
					updateNewDownloadProvider,
				} = useDownloadSearchPreferencesActions(setModalState);

	return (
		<div className={ styles.settingColumn }>
			<DownloadProvidersSettings
				editDraft={ modalState.editDownloadProvider }
				editingProviderId={ modalState.editingDownloadProviderId }
				isAddingProvider={ modalState.isAddingDownloadProvider }
				newProviderDraft={ modalState.newDownloadProvider }
				providers={ modalState.downloadProviders }
				onCancelAdd={ cancelAddingDownloadProvider }
				onCancelEdit={ cancelEditingDownloadProvider }
				onCreateProvider={ createDownloadProvider }
				onDeleteProvider={ deleteDownloadProvider }
				onEditDraftChange={ updateEditDownloadProvider }
				onNewDraftChange={ updateNewDownloadProvider }
				onSaveEdit={ updateDownloadProvider }
				onStartEdit={ startEditingDownloadProvider }
				onToggleAddForm={ toggleAddingDownloadProvider }
				onToggleProvider={ handleProviderToggle }
			/>
			<DownloadBrowserSettings
				browserDraft={ modalState.downloadBrowserDraft }
				customPath={ modalState.downloadBrowserCustomPath }
				onBrowserModeChange={ updateBrowserMode }
				onCustomPathChange={ updateBrowserCustomPath }
				onPickExecutable={ pickDownloadBrowserExecutable }
				onRevertChanges={ revertBrowserChanges }
				onSaveChanges={ saveDownloadBrowserConfig }
			/>
		</div>
	);
}
