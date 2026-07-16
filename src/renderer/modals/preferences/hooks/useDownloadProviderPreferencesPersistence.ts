import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type { PreferencesModalState } from "../../../types/modals";
import {
	appendCreatedDownloadProvider,
	cancelEditingDownloadProviderDraft,
	removeDownloadProvider,
	replaceUpdatedDownloadProvider,
	setDownloadProviderEnabled,
	startEditingDownloadProviderDraft,
} from "../download-search-preferences-model";
import {
	createDownloadProviderPreference,
	deleteDownloadProviderPreference,
	setDownloadProviderEnabledPreference,
	updateDownloadProviderPreference,
} from "../download-search-preferences-runner";
import { usePreferenceOperationFeedback } from "../preferences-operation-feedback";

interface UseDownloadProviderPreferencesPersistenceResult {
	createDownloadProvider: () => void;
	deleteDownloadProvider: (providerId: string) => void;
	handleProviderToggle: (providerId: string, enabled: boolean) => void;
	startEditingDownloadProvider: (providerId: string) => void;
	cancelEditingDownloadProvider: () => void;
	updateDownloadProvider: () => void;
}

// Provider CRUD and toggles are isolated from browser executable settings so
// future provider behavior does not grow the broader Preferences controller.
export function useDownloadProviderPreferencesPersistence(
	modalState: PreferencesModalState,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): UseDownloadProviderPreferencesPersistenceResult {
	const { showPreferenceOperationError } = usePreferenceOperationFeedback();

	const handleProviderToggle = useCallback(
		(providerId: string, enabled: boolean) => {
			setModalState(prevState => setDownloadProviderEnabled(
				prevState,
				providerId,
				enabled,
			));
			setDownloadProviderEnabledPreference(
				providerId,
				enabled,
			).catch((error: unknown) => {
				setModalState((prevState) => {
					const provider = prevState.downloadProviders.find((candidate) => candidate.id === providerId);
					if (!provider || provider.enabled !== enabled) {
						return prevState;
					}

					return setDownloadProviderEnabled(
						prevState,
						providerId,
						!enabled,
					);
				});
				showPreferenceOperationError(
					error,
					"Failed to save download provider status.",
				);
			});
		},
		[
			setModalState,
			showPreferenceOperationError,
		],
	);

	const createDownloadProvider = useCallback(
		() => {
			createDownloadProviderPreference(modalState.newDownloadProvider)
				.then((provider) => {
					setModalState(prevState => appendCreatedDownloadProvider(
						prevState,
						provider,
					));
				})
				.catch((error: unknown) => showPreferenceOperationError(
					error,
					"Failed to create download provider.",
				));
		},
		[
			modalState.newDownloadProvider,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const startEditingDownloadProvider = useCallback(
		(providerId: string) => {
			setModalState(prevState => startEditingDownloadProviderDraft(
				prevState,
				providerId,
			));
		},
		[ setModalState ],
	);

	const cancelEditingDownloadProvider = useCallback(
		() => {
			setModalState(cancelEditingDownloadProviderDraft);
		},
		[ setModalState ],
	);

	const updateDownloadProvider = useCallback(
		() => {
			const providerId = modalState.editingDownloadProviderId;
			if (!providerId) {
				return;
			}

			updateDownloadProviderPreference(
				providerId,
				modalState.editDownloadProvider,
			)
				.then((provider) => {
					setModalState(prevState => replaceUpdatedDownloadProvider(
						prevState,
						provider,
					));
				})
				.catch((error: unknown) => showPreferenceOperationError(
					error,
					"Failed to update download provider.",
				));
		},
		[
			modalState.editDownloadProvider,
			modalState.editingDownloadProviderId,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const deleteDownloadProvider = useCallback(
		(providerId: string) => {
			deleteDownloadProviderPreference(providerId)
				.then(() => {
					setModalState(prevState => removeDownloadProvider(
						prevState,
						providerId,
					));
				})
				.catch((error: unknown) => showPreferenceOperationError(
					error,
					"Failed to delete download provider.",
				));
		},
		[
			setModalState,
			showPreferenceOperationError,
		],
	);

	return {
		createDownloadProvider,
		deleteDownloadProvider,
		handleProviderToggle,
		startEditingDownloadProvider,
		cancelEditingDownloadProvider,
		updateDownloadProvider,
	};
}
