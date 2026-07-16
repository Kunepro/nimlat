import type {
	ExternalTrackingAccount,
	ExternalTrackingExportProgressEvent,
	ExternalTrackingProvider,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import {
	useCallback,
	useMemo,
} from "react";
import type {
	ExternalTrackingActionFeedbackType,
	ExternalTrackingProviderDrafts,
} from "../external-tracking-preferences-model";
import type { ExternalTrackingProviderPanelActions } from "../external-tracking-provider-panel-model";
import { useExternalTrackingActions } from "./useExternalTrackingActions";
import { useExternalTrackingCredentialZap } from "./useExternalTrackingCredentialZap";
import { useExternalTrackingDrafts } from "./useExternalTrackingDrafts";
import { useExternalTrackingExportProgress } from "./useExternalTrackingExportProgress";
import { useExternalTrackingSettings } from "./useExternalTrackingSettings";

interface UseExternalTrackingPreferencesControllerResult {
	accounts: ExternalTrackingAccount[];
	busyProvider: ExternalTrackingProvider | null;
	drafts: ExternalTrackingProviderDrafts;
	exportProgress: ExternalTrackingExportProgressEvent | null;
	message: string | null;
	messageProvider: ExternalTrackingProvider | null;
	messageType: ExternalTrackingActionFeedbackType | null;
	openProviders: ExternalTrackingProvider[];
	panelActions: ExternalTrackingProviderPanelActions;
	isRetryingSecretStorage: boolean;
	retrySecretStorage: () => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
	zappedProvider: ExternalTrackingProvider | null;
	setOpenProviders: (providers: ExternalTrackingProvider[]) => void;
}

export function useExternalTrackingPreferencesController(): UseExternalTrackingPreferencesControllerResult {
	const {
					drafts,
					mergeAccountDraftValues,
					updateDraft,
				}            = useExternalTrackingDrafts();
	const {
					openProviders,
					setOpenProviders,
					triggerCredentialZap,
					zappedProvider,
				}            = useExternalTrackingCredentialZap();
	const {
					accounts,
					isRetryingSecretStorage,
					refreshSettings,
					retrySecretStorage,
					secretStorage,
				}            = useExternalTrackingSettings({
		onAccountsLoaded: mergeAccountDraftValues,
	});
	const clearKitsuPassword = useCallback(
		() => updateDraft(
			"kitsu",
			{ password: "" },
		),
		[ updateDraft ],
	);
	const exportProgress = useExternalTrackingExportProgress();
	const {
					busyProvider,
					connectKitsu,
					disconnectProvider,
					exportProvider,
					importProvider,
					importKitsuPublic,
					importKitsuXml,
					message,
					messageProvider,
					messageType,
					requestAniListToken,
					saveAniListToken,
					startConnection,
				}            = useExternalTrackingActions({
		drafts,
		clearKitsuPassword,
		refreshSettings,
		triggerCredentialZap,
	});
	const panelActions = useMemo<ExternalTrackingProviderPanelActions>(
		() => ({
			connectKitsu,
			disconnect: disconnectProvider,
			exportProvider,
			importProvider,
			importKitsuPublic,
			importKitsuXml,
			requestAniListToken,
			saveAniListToken,
			startConnection,
			updateDraft,
		}),
		[
			connectKitsu,
			disconnectProvider,
			exportProvider,
			importProvider,
			importKitsuPublic,
			importKitsuXml,
			requestAniListToken,
			saveAniListToken,
			startConnection,
			updateDraft,
		],
	);

	return {
		accounts,
		busyProvider,
		drafts,
		exportProgress,
		message,
		messageProvider,
		messageType,
		openProviders,
		panelActions,
		isRetryingSecretStorage,
		retrySecretStorage,
		secretStorage,
		setOpenProviders,
		zappedProvider,
	};
}
