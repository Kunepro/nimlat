import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	useCallback,
	useRef,
	useState,
} from "react";
import {
	createDefaultExternalTrackingDrafts,
	type ExternalTrackingProviderDraft,
	type ExternalTrackingProviderDrafts,
	mergeExternalTrackingAccountDraftValues,
} from "../external-tracking-preferences-model";

interface UseExternalTrackingDraftsResult {
	drafts: ExternalTrackingProviderDrafts;
	mergeAccountDraftValues: (accounts: ExternalTrackingAccount[]) => void;
	updateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
}

// Keeps provider credential drafts local to the preferences UI while preserving
// saved client ids reported by main-process external-tracking settings.
export function useExternalTrackingDrafts(): UseExternalTrackingDraftsResult {
	const [ drafts, setDrafts ] = useState<ExternalTrackingProviderDrafts>(() => createDefaultExternalTrackingDrafts());
	const hasHydratedAccountsRef    = useRef(false);
	const hasEditedKitsuUsernameRef = useRef(false);

	const mergeAccountDraftValues = useCallback(
		(accounts: ExternalTrackingAccount[]) => {
			const hydrateKitsuPublicIdentifier = !hasHydratedAccountsRef.current
				&& !hasEditedKitsuUsernameRef.current;
			setDrafts(prevDrafts => mergeExternalTrackingAccountDraftValues(
				prevDrafts,
				accounts,
				hydrateKitsuPublicIdentifier,
			));
			hasHydratedAccountsRef.current = true;
		},
		[],
	);

	const updateDraft = useCallback(
		(provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => {
			if (provider === "kitsu" && patch.username !== undefined) {
				hasEditedKitsuUsernameRef.current = true;
			}
			setDrafts(prevDrafts => ({
				...prevDrafts,
				[ provider ]: {
					...prevDrafts[ provider ],
					...patch,
				},
			}));
		},
		[],
	);

	return {
		drafts,
		mergeAccountDraftValues,
		updateDraft,
	};
}
