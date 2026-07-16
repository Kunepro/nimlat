import type {
	Dispatch,
	SetStateAction,
} from "react";
import type { PreferencesModalState } from "../../../types/modals";
import { useDownloadBrowserPreferencesPersistence } from "./useDownloadBrowserPreferencesPersistence";
import { useDownloadProviderPreferencesPersistence } from "./useDownloadProviderPreferencesPersistence";

interface UseDownloadSearchPreferencesPersistenceResult {
	createDownloadProvider: () => void;
	deleteDownloadProvider: (providerId: string) => void;
	handleProviderToggle: (providerId: string, enabled: boolean) => void;
	pickDownloadBrowserExecutable: () => void;
	saveDownloadBrowserConfig: () => void;
	startEditingDownloadProvider: (providerId: string) => void;
	cancelEditingDownloadProvider: () => void;
	updateDownloadProvider: () => void;
}

// Public Preferences adapter kept for controller stability. Domain-specific
// hooks own provider CRUD and browser executable persistence separately.
export function useDownloadSearchPreferencesPersistence(
	modalState: PreferencesModalState,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): UseDownloadSearchPreferencesPersistenceResult {
	const providerPersistence = useDownloadProviderPreferencesPersistence(
		modalState,
		setModalState,
	);
	const browserPersistence  = useDownloadBrowserPreferencesPersistence(
		modalState,
		setModalState,
	);

	return {
		...providerPersistence,
		...browserPersistence,
	};
}
