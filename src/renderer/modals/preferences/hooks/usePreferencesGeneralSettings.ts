import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useState,
} from "react";
import type { PreferencesModalState } from "../../../types/modals";
import {
	saveAdultContentPreference,
	saveBackgroundStylePreference,
	saveCanvasDiagnosticsPreference,
	savePreferredTitleLanguagePreference,
} from "../preferences-general-settings-runner";
import { usePreferenceOperationFeedback } from "../preferences-operation-feedback";
import {
	type OptimisticPreferenceKey,
	revertOptimisticPreferenceIfCurrent,
	setOptimisticPreference,
} from "../preferences-settings-model";
import { useAdultContentStatus } from "../useAdultContentStatus";

interface UsePreferencesGeneralSettingsResult {
	isAdultConfirmOpen: boolean;
	handleAdultToggle: (event: CheckboxChangeEvent) => void;
	handleBackgroundStyleChange: (style: BackgroundStyle) => void;
	handleCanvasDiagnosticsToggle: (event: CheckboxChangeEvent) => void;
	handlePreferredTitleLanguageChange: (language: PreferredTitleLanguage) => void;
	persistAdultContentStatus: (enabled: boolean) => void;
	setAdultConfirmOpen: Dispatch<SetStateAction<boolean>>;
}

type ShowPreferenceOperationError = (error: unknown, fallbackMessage: string) => void;

interface PersistOptimisticPreferenceRequest<K extends OptimisticPreferenceKey> {
	failureMessage: string;
	key: K;
	nextValue: PreferencesModalState[K];
	persist: (value: PreferencesModalState[K]) => Promise<void>;
	previousValue: PreferencesModalState[K];
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>;
	showPreferenceOperationError: ShowPreferenceOperationError;
}

function persistOptimisticPreference<K extends OptimisticPreferenceKey>({
																																					failureMessage,
																																					key,
																																					nextValue,
																																					persist,
																																					previousValue,
																																					setModalState,
																																					showPreferenceOperationError,
																																				}: PersistOptimisticPreferenceRequest<K>): void {
	setModalState(prevState => setOptimisticPreference(
		prevState,
		key,
		nextValue,
	));

	persist(nextValue).catch((error: unknown) => {
		setModalState(prevState => revertOptimisticPreferenceIfCurrent(
			prevState,
			key,
			nextValue,
			previousValue,
		));
		showPreferenceOperationError(
			error,
			failureMessage,
		);
	});
}

export function usePreferencesGeneralSettings(
	modalState: PreferencesModalState,
	setModalState: Dispatch<SetStateAction<PreferencesModalState>>,
): UsePreferencesGeneralSettingsResult {
	const { showPreferenceOperationError }            = usePreferenceOperationFeedback();
	const [ isAdultConfirmOpen, setAdultConfirmOpen ] = useState(false);

	const persistAdultContentStatus = useCallback(
		(enabled: boolean) => {
			persistOptimisticPreference({
				failureMessage: "Failed to save adult-content preference.",
				key:            "isAdultContentEnabled",
				nextValue:      enabled,
				persist:        saveAdultContentPreference,
				previousValue:  modalState.isAdultContentEnabled,
				setModalState,
				showPreferenceOperationError,
			});
		},
		[
			modalState.isAdultContentEnabled,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const handleAdultToggle = useCallback(
		(event: CheckboxChangeEvent) => {
			const enabled = event.target.checked;

			if (!enabled) {
				persistAdultContentStatus(false);
				return;
			}

			setAdultConfirmOpen(true);
		},
		[ persistAdultContentStatus ],
	);

	const handleBackgroundStyleChange = useCallback(
		(style: BackgroundStyle) => {
			persistOptimisticPreference({
				failureMessage: "Failed to save background preference.",
				key:            "backgroundStyle",
				nextValue:      style,
				persist:        saveBackgroundStylePreference,
				previousValue:  modalState.backgroundStyle,
				setModalState,
				showPreferenceOperationError,
			});
		},
		[
			modalState.backgroundStyle,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const handlePreferredTitleLanguageChange = useCallback(
		(language: PreferredTitleLanguage) => {
			persistOptimisticPreference({
				failureMessage: "Failed to save title-language preference.",
				key:            "preferredTitleLanguage",
				nextValue:      language,
				persist:        savePreferredTitleLanguagePreference,
				previousValue:  modalState.preferredTitleLanguage,
				setModalState,
				showPreferenceOperationError,
			});
		},
		[
			modalState.preferredTitleLanguage,
			setModalState,
			showPreferenceOperationError,
		],
	);

	const handleCanvasDiagnosticsToggle = useCallback(
		(event: CheckboxChangeEvent) => {
			const enabled = event.target.checked;

			persistOptimisticPreference({
				failureMessage: "Failed to save canvas diagnostics preference.",
				key:            "isCanvasDiagnosticsEnabled",
				nextValue:      enabled,
				persist:        saveCanvasDiagnosticsPreference,
				previousValue:  modalState.isCanvasDiagnosticsEnabled,
				setModalState,
				showPreferenceOperationError,
			});
		},
		[
			modalState.isCanvasDiagnosticsEnabled,
			setModalState,
			showPreferenceOperationError,
		],
	);

	useAdultContentStatus(
		modalState.isOpen,
		setModalState,
	);

	return {
		isAdultConfirmOpen,
		handleAdultToggle,
		handleBackgroundStyleChange,
		handleCanvasDiagnosticsToggle,
		handlePreferredTitleLanguageChange,
		persistAdultContentStatus,
		setAdultConfirmOpen,
	};
}
