import type { ExternalTrackingProvider } from "@nimlat/types/external-tracking";
import { useCallback } from "react";
import type {
	ExternalTrackingActionFeedbackType,
	ExternalTrackingProviderDrafts,
} from "../external-tracking-preferences-model";
import {
	connectKitsuExternalTracking,
	disconnectExternalTrackingProvider,
	exportExternalTrackingProvider,
	importExternalTrackingProvider,
	importKitsuPublicExternalTracking,
	importKitsuXmlExternalTracking,
	requestAniListExternalTrackingAccessToken,
	saveAniListExternalTrackingToken,
	startExternalTrackingConnection,
} from "../external-tracking-preferences-runner";
import { useExternalTrackingActionRunner } from "./useExternalTrackingActionRunner";

interface UseExternalTrackingActionsOptions {
	drafts: ExternalTrackingProviderDrafts;
	refreshSettings: () => void;
	triggerCredentialZap: (provider: ExternalTrackingProvider) => void;
	clearKitsuPassword: () => void;
}

interface UseExternalTrackingActionsResult {
	busyProvider: ExternalTrackingProvider | null;
	message: string | null;
	messageProvider: ExternalTrackingProvider | null;
	messageType: ExternalTrackingActionFeedbackType | null;
	connectKitsu: () => void;
	disconnectProvider: (provider: ExternalTrackingProvider) => void;
	exportProvider: (provider: ExternalTrackingProvider) => void;
	importProvider: (provider: ExternalTrackingProvider) => void;
	importKitsuPublic: () => void;
	importKitsuXml: () => void;
	requestAniListToken: () => void;
	saveAniListToken: () => void;
	startConnection: (provider: ExternalTrackingProvider) => void;
}

// Write-side commands for external tracking. Payload construction stays pure,
// while command execution remains behind the renderer facade and main services.
export function useExternalTrackingActions({
																						 drafts,
																						 refreshSettings,
																						 triggerCredentialZap,
																						 clearKitsuPassword,
																					 }: UseExternalTrackingActionsOptions): UseExternalTrackingActionsResult {
	const {
					busyProvider,
					message,
					messageProvider,
					messageType,
					runExternalTrackingAction,
				} = useExternalTrackingActionRunner({
		refreshSettings,
		triggerCredentialZap,
	});

	const startConnection = useCallback(
		(provider: ExternalTrackingProvider) => {
			runExternalTrackingAction(
				provider,
				() => startExternalTrackingConnection(
					provider,
					drafts,
				),
			);
		},
		[
			drafts,
			runExternalTrackingAction,
		],
	);

	const saveAniListToken = useCallback(
		() => {
			runExternalTrackingAction(
				"anilist",
				() => saveAniListExternalTrackingToken(drafts),
				{ zapOnSuccess: true },
			);
		},
		[
			drafts,
			runExternalTrackingAction,
		],
	);

	const requestAniListToken = useCallback(
		() => {
			runExternalTrackingAction(
				"anilist",
				() => requestAniListExternalTrackingAccessToken(drafts),
				{ refreshSettings: false },
			);
		},
		[
			drafts,
			runExternalTrackingAction,
		],
	);

	const connectKitsu = useCallback(
		() => {
			// Keep Kitsu expanded after connecting so the refreshed account state,
			// status feedback, and available import/export actions remain visible.
			runExternalTrackingAction(
				"kitsu",
				() => connectKitsuExternalTracking(drafts).finally(clearKitsuPassword),
			);
		},
		[
			clearKitsuPassword,
			drafts,
			runExternalTrackingAction,
		],
	);

	const importProvider = useCallback(
		(provider: ExternalTrackingProvider) => {
			runExternalTrackingAction(
				provider,
				() => importExternalTrackingProvider(provider),
			);
		},
		[ runExternalTrackingAction ],
	);

	const importKitsuPublic = useCallback(
		() => {
			runExternalTrackingAction(
				"kitsu",
				() => importKitsuPublicExternalTracking(drafts),
			);
		},
		[
			drafts,
			runExternalTrackingAction,
		],
	);

	const importKitsuXml = useCallback(
		() => {
			runExternalTrackingAction(
				"kitsu",
				importKitsuXmlExternalTracking,
			);
		},
		[ runExternalTrackingAction ],
	);

	const exportProvider = useCallback(
		(provider: ExternalTrackingProvider) => {
			runExternalTrackingAction(
				provider,
				() => exportExternalTrackingProvider(provider),
			);
		},
		[ runExternalTrackingAction ],
	);

	const disconnectProvider = useCallback(
		(provider: ExternalTrackingProvider) => {
			runExternalTrackingAction(
				provider,
				() => disconnectExternalTrackingProvider(provider),
			);
		},
		[ runExternalTrackingAction ],
	);

	return {
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
	};
}
