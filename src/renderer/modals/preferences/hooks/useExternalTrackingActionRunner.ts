import type { ExternalTrackingProvider } from "@nimlat/types/external-tracking";
import {
	useCallback,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import {
	type ExternalTrackingActionFeedbackType,
	formatExternalTrackingActionError,
	getExternalTrackingActionFeedbackType,
	getExternalTrackingActionResultMessage,
} from "../external-tracking-preferences-model";

interface UseExternalTrackingActionRunnerOptions {
	refreshSettings: () => void;
	triggerCredentialZap: (provider: ExternalTrackingProvider) => void;
}

interface RunExternalTrackingActionOptions {
	refreshSettings?: boolean;
	zapOnSuccess?: boolean;
}

interface UseExternalTrackingActionRunnerResult {
	busyProvider: ExternalTrackingProvider | null;
	message: string | null;
	messageProvider: ExternalTrackingProvider | null;
	messageType: ExternalTrackingActionFeedbackType | null;
	runExternalTrackingAction: (
		provider: ExternalTrackingProvider,
		action: () => Promise<unknown> | unknown,
		options?: RunExternalTrackingActionOptions,
	) => void;
}

// Owns the transient lifecycle for external-tracking write commands. Keeping this
// separate from payload construction makes each provider action a small command.
export function useExternalTrackingActionRunner({
																									refreshSettings,
																									triggerCredentialZap,
																								}: UseExternalTrackingActionRunnerOptions): UseExternalTrackingActionRunnerResult {
	const [ busyProvider, setBusyProvider ] = useState<ExternalTrackingProvider | null>(null);
	const [ message, setMessage ]           = useState<string | null>(null);
	const [ messageProvider, setMessageProvider ] = useState<ExternalTrackingProvider | null>(null);
	const [ messageType, setMessageType ]         = useState<ExternalTrackingActionFeedbackType | null>(null);
	const isMountedRef                      = useIsMountedRef();

	const runExternalTrackingAction = useCallback(
		(
			provider: ExternalTrackingProvider,
			action: () => Promise<unknown> | unknown,
			options?: RunExternalTrackingActionOptions,
		) => {
			setBusyProvider(provider);
			setMessage(null);
			setMessageProvider(provider);
			setMessageType(null);
			// Start inside the promise chain so main-process bridge setup errors and
			// other synchronous failures use the same visible feedback path.
			Promise.resolve()
				.then(action)
				.then((result) => {
					if (!isMountedRef.current) {
						return;
					}
					const resultMessage = getExternalTrackingActionResultMessage(result);
					const feedbackType = getExternalTrackingActionFeedbackType(result);
					if (resultMessage) {
						setMessage(resultMessage);
						setMessageType(feedbackType);
					}
					if (options?.zapOnSuccess && feedbackType === "success") {
						triggerCredentialZap(provider);
					}
					if (options?.refreshSettings !== false) {
						refreshSettings();
					}
				})
				.catch((error: unknown) => {
					if (isMountedRef.current) {
						setMessage(formatExternalTrackingActionError(error));
						setMessageType("error");
						// A failed credential write may be the user's Keychain denial. Refresh
						// so the contextual retry action appears immediately after the prompt.
						if (options?.refreshSettings !== false) {
							refreshSettings();
						}
					}
				})
				.finally(() => {
					if (isMountedRef.current) {
						setBusyProvider(null);
					}
				});
		},
		[
			isMountedRef,
			refreshSettings,
			triggerCredentialZap,
		],
	);

	return {
		busyProvider,
		message,
		messageProvider,
		messageType,
		runExternalTrackingAction,
	};
}
