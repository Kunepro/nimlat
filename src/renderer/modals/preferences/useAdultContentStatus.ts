import { useEffect } from "react";
import type { PreferencesModalState } from "../../types/modals";
import { loadAdultContentPreference } from "./preferences-general-settings-runner";
import { usePreferenceOperationFeedback } from "./preferences-operation-feedback";

type SetPreferencesModalState = (
	updater: (prevState: PreferencesModalState) => PreferencesModalState,
) => void;

export const useAdultContentStatus = (
	isOpen: boolean,
	setModalState: SetPreferencesModalState,
) => {
	const { showPreferenceOperationError } = usePreferenceOperationFeedback();

	useEffect(
		() => {
			if (!isOpen) {
				return;
			}

			let isMounted = true;

			loadAdultContentPreference()
				.then(enabled => {
					if (!isMounted) {
						return;
					}

					setModalState(prevState => ({
						...prevState,
						isAdultContentEnabled: enabled,
					}));
				})
				.catch((error: unknown) => {
					if (isMounted) {
						showPreferenceOperationError(
							error,
							"Failed to load adult-content preference.",
						);
					}
				});

			return () => {
				isMounted = false;
			};
		},
		[
			isOpen,
			setModalState,
			showPreferenceOperationError,
		],
	);
};
