import type {
	ExternalTrackingAccount,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import { orderExternalTrackingAccounts } from "../external-tracking-preferences-model";
import {
	loadExternalTrackingSettings,
	retryExternalTrackingSecretStorage,
	subscribeToExternalTrackingAccountsChanges,
} from "../external-tracking-preferences-runner";
import { usePreferenceOperationFeedback } from "../preferences-operation-feedback";

interface UseExternalTrackingSettingsOptions {
	onAccountsLoaded: (accounts: ExternalTrackingAccount[]) => void;
}

interface UseExternalTrackingSettingsResult {
	accounts: ExternalTrackingAccount[];
	refreshSettings: () => void;
	isRetryingSecretStorage: boolean;
	retrySecretStorage: () => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
}

// Read-side settings feed for external-tracking preferences.
// Account change events trigger a fresh main-process snapshot instead of mirroring state locally.
export function useExternalTrackingSettings({
																							onAccountsLoaded,
																						}: UseExternalTrackingSettingsOptions): UseExternalTrackingSettingsResult {
	const { showPreferenceOperationError } = usePreferenceOperationFeedback();
	const [ settings, setSettings ]        = useState<ExternalTrackingSettings | null>(null);
	const [ isRetryingSecretStorage, setIsRetryingSecretStorage ] = useState(false);
	const isMountedRef                     = useIsMountedRef();

	const refreshSettings = useCallback(
		() => {
			loadExternalTrackingSettings()
				.then((nextSettings) => {
					if (!isMountedRef.current) {
						return;
					}

					setSettings(nextSettings);
					onAccountsLoaded(nextSettings.accounts);
				})
				.catch((error: unknown) => {
					if (isMountedRef.current) {
						showPreferenceOperationError(
							error,
							"Failed to load external tracking preferences.",
						);
					}
				});
		},
		[
			isMountedRef,
			onAccountsLoaded,
			showPreferenceOperationError,
		],
	);

	useEffect(
		() => {
			refreshSettings();
			const accountsSubscription = subscribeToExternalTrackingAccountsChanges(refreshSettings);

			return () => {
				accountsSubscription.unsubscribe();
			};
		},
		[ refreshSettings ],
	);

	const accounts = useMemo(
		() => orderExternalTrackingAccounts(settings?.accounts),
		[ settings ],
	);

	const retrySecretStorage = useCallback(
		() => {
			setIsRetryingSecretStorage(true);
			retryExternalTrackingSecretStorage()
				.then((secretStorage) => {
					if (!isMountedRef.current) {
						return;
					}

					setSettings(current => current
						? {
							...current,
							secretStorage,
						}
						: current);
				})
				.catch((error: unknown) => {
					if (isMountedRef.current) {
						showPreferenceOperationError(
							error,
							"Failed to restore secure credential storage.",
						);
						refreshSettings();
					}
				})
				.finally(() => {
					if (isMountedRef.current) {
						setIsRetryingSecretStorage(false);
					}
				});
		},
		[
			isMountedRef,
			refreshSettings,
			showPreferenceOperationError,
		],
	);

	return {
		accounts,
		refreshSettings,
		isRetryingSecretStorage,
		retrySecretStorage,
		secretStorage: settings?.secretStorage ?? null,
	};
}
