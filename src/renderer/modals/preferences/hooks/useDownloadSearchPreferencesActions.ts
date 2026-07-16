import type { DownloadBrowserMode } from "@nimlat/types/download-search";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type {
	DownloadProviderFormState,
	PreferencesModalState,
} from "../../../types/modals";
import {
	cancelAddingDownloadProviderForm,
	revertDownloadBrowserDraftChanges,
	toggleAddingDownloadProviderForm,
	updateDownloadBrowserCustomPathDraft,
	updateDownloadBrowserModeDraft,
	updateEditDownloadProviderDraft,
	updateNewDownloadProviderDraft,
} from "../download-search-preferences-model";

interface UseDownloadSearchPreferencesActionsResult {
	cancelAddingDownloadProvider: () => void;
	revertBrowserChanges: () => void;
	toggleAddingDownloadProvider: () => void;
	updateBrowserCustomPath: (path: string) => void;
	updateBrowserMode: (mode: DownloadBrowserMode) => void;
	updateEditDownloadProvider: (patch: Partial<DownloadProviderFormState>) => void;
	updateNewDownloadProvider: (patch: Partial<DownloadProviderFormState>) => void;
}

// Local state patchers are grouped so the preferences section can stay declarative.
// Main-process persistence remains in the parent controller.
export function useDownloadSearchPreferencesActions(
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): UseDownloadSearchPreferencesActionsResult {
	const updateNewDownloadProvider = useCallback(
		(patch: Partial<DownloadProviderFormState>) => {
			setModalState(prevState => updateNewDownloadProviderDraft(
				prevState,
				patch,
			));
		},
		[ setModalState ],
	);

	const updateEditDownloadProvider = useCallback(
		(patch: Partial<DownloadProviderFormState>) => {
			setModalState(prevState => updateEditDownloadProviderDraft(
				prevState,
				patch,
			));
		},
		[ setModalState ],
	);

	const toggleAddingDownloadProvider = useCallback(
		() => {
			setModalState(toggleAddingDownloadProviderForm);
		},
		[ setModalState ],
	);

	const cancelAddingDownloadProvider = useCallback(
		() => {
			setModalState(cancelAddingDownloadProviderForm);
		},
		[ setModalState ],
	);

	const updateBrowserMode = useCallback(
		(mode: DownloadBrowserMode) => {
			setModalState(prevState => updateDownloadBrowserModeDraft(
				prevState,
				mode,
			));
		},
		[ setModalState ],
	);

	const updateBrowserCustomPath = useCallback(
		(path: string) => {
			setModalState(prevState => updateDownloadBrowserCustomPathDraft(
				prevState,
				path,
			));
		},
		[ setModalState ],
	);

	const revertBrowserChanges = useCallback(
		() => {
			setModalState(revertDownloadBrowserDraftChanges);
		},
		[ setModalState ],
	);

	return {
		cancelAddingDownloadProvider,
		revertBrowserChanges,
		toggleAddingDownloadProvider,
		updateBrowserCustomPath,
		updateBrowserMode,
		updateEditDownloadProvider,
		updateNewDownloadProvider,
	};
}
