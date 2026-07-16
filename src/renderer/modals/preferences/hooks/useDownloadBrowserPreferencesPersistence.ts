import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type { PreferencesModalState } from "../../../types/modals";
import {
	applyPickedDownloadBrowserExecutable,
	commitDownloadBrowserConfig,
} from "../download-search-preferences-model";
import {
	pickDownloadBrowserExecutablePath,
	saveDownloadBrowserConfigDraft,
} from "../download-search-preferences-runner";
import { usePreferenceOperationFeedback } from "../preferences-operation-feedback";

interface UseDownloadBrowserPreferencesPersistenceResult {
	pickDownloadBrowserExecutable: () => void;
	saveDownloadBrowserConfig: () => void;
}

// Browser executable settings are persisted independently from provider CRUD.
// This keeps OS-dialog and config-save behavior out of provider orchestration.
export function useDownloadBrowserPreferencesPersistence(
	modalState: PreferencesModalState,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): UseDownloadBrowserPreferencesPersistenceResult {
	const { showPreferenceOperationError } = usePreferenceOperationFeedback();

	const saveDownloadBrowserConfig = useCallback(
		() => {
			saveDownloadBrowserConfigDraft(
				modalState.downloadBrowserDraft.mode,
				modalState.downloadBrowserCustomPath,
			)
				.then((configToSave) => {
					setModalState(prevState => commitDownloadBrowserConfig(
						prevState,
						configToSave,
					));
				})
				.catch((error: unknown) => showPreferenceOperationError(
					error,
					"Failed to save download browser settings.",
				));
		},
		[
			modalState.downloadBrowserCustomPath,
			modalState.downloadBrowserDraft.mode,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const pickDownloadBrowserExecutable = useCallback(
		() => {
			pickDownloadBrowserExecutablePath()
				.then((executablePath) => {
					if (!executablePath) {
						return;
					}
					setModalState(prevState => applyPickedDownloadBrowserExecutable(
						prevState,
						executablePath,
					));
				})
				.catch((error: unknown) => showPreferenceOperationError(
					error,
					"Failed to pick a browser executable.",
				));
		},
		[
			setModalState,
			showPreferenceOperationError,
		],
	);

	return {
		pickDownloadBrowserExecutable,
		saveDownloadBrowserConfig,
	};
}
