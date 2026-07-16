import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useEffect } from "react";
import type { PreferencesModalState } from "../../../types/modals";
import { loadDownloadSearchPreferencesSettings } from "../download-search-preferences-runner";
import {
	loadBackgroundStylePreference,
	loadCanvasDiagnosticsPreference,
	loadDevModePreference,
	loadPreferredTitleLanguagePreference,
} from "../preferences-general-settings-runner";
import { usePreferenceOperationFeedback } from "../preferences-operation-feedback";
import {
	applyLoadedBackgroundStyle,
	applyLoadedCanvasDiagnosticsStatus,
	applyLoadedDevModeStatus,
	applyLoadedDownloadSearchSettings,
	applyLoadedPreferredTitleLanguage,
	recoverFailedDevModeLoad,
} from "../preferences-settings-model";

interface InitialPreferenceLoad<Value> {
	load: () => Promise<Value>;
	apply: (state: PreferencesModalState, value: Value) => PreferencesModalState;
	failureMessage: string;
	recover?: (state: PreferencesModalState) => PreferencesModalState;
}

type ShowPreferenceOperationError = (error: unknown, fallbackMessage: string) => void;

function queueInitialPreferenceLoad<Value>(
	config: InitialPreferenceLoad<Value>,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
	isCancelled: () => boolean,
	showPreferenceOperationError: ShowPreferenceOperationError,
): void {
	config.load()
		.then((value) => {
			if (isCancelled()) {
				return;
			}

			setModalState(prevState => config.apply(
				prevState,
				value,
			));
		})
		.catch((error: unknown) => {
			if (isCancelled()) {
				return;
			}

			if (config.recover) {
				setModalState(config.recover);
			}
			showPreferenceOperationError(
				error,
				config.failureMessage,
			);
		});
}

export function usePreferencesInitialSettingsLoad(
	isOpen: boolean,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): void {
	const { showPreferenceOperationError } = usePreferenceOperationFeedback();

	useEffect(
		() => {
			if (!isOpen) {
				return;
			}

			let cancelled     = false;
			const isCancelled = () => cancelled;

			queueInitialPreferenceLoad(
				{
					load:           loadBackgroundStylePreference,
					apply:          applyLoadedBackgroundStyle,
					failureMessage: "Failed to load background preference.",
				},
				setModalState,
				isCancelled,
				showPreferenceOperationError,
			);
			queueInitialPreferenceLoad(
				{
					load:           loadPreferredTitleLanguagePreference,
					apply:          applyLoadedPreferredTitleLanguage,
					failureMessage: "Failed to load title-language preference.",
				},
				setModalState,
				isCancelled,
				showPreferenceOperationError,
			);
			queueInitialPreferenceLoad(
				{
					load:           loadDevModePreference,
					apply:          applyLoadedDevModeStatus,
					recover:        recoverFailedDevModeLoad,
					failureMessage: "Failed to load developer-mode preference.",
				},
				setModalState,
				isCancelled,
				showPreferenceOperationError,
			);
			queueInitialPreferenceLoad(
				{
					load:           loadCanvasDiagnosticsPreference,
					apply:          applyLoadedCanvasDiagnosticsStatus,
					failureMessage: "Failed to load canvas diagnostics preference.",
				},
				setModalState,
				isCancelled,
				showPreferenceOperationError,
			);
			queueInitialPreferenceLoad(
				{
					load:           loadDownloadSearchPreferencesSettings,
					apply:          applyLoadedDownloadSearchSettings,
					failureMessage: "Failed to load download-search preferences.",
				},
				setModalState,
				isCancelled,
				showPreferenceOperationError,
			);

			return () => {
				cancelled = true;
			};
		},
		[
			isOpen,
			setModalState,
			showPreferenceOperationError,
		],
	);
}
