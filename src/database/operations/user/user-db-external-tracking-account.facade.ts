import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	completeExternalTrackingAccount,
	disconnectExternalTrackingAccount,
	type ExternalTrackingAccountSecretRow,
	markExternalTrackingAccountError,
	selectAllExternalTrackingAccountSecrets,
	selectExternalTrackingAccounts,
	selectExternalTrackingAccountSecret,
	updateExternalTrackingAccountSecrets,
	upsertExternalTrackingPendingConnection,
} from "./external-tracking/user-external-tracking-accounts";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Account facade for provider connection metadata and encrypted secret rows.
// Provider auth decisions stay in main services; this layer only persists state.
export const UserDbExternalTrackingAccountFacade = {
	listAccounts: (): ExternalTrackingAccount[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.listAccounts",
			() => selectExternalTrackingAccounts(),
		);
	},

	getAccountSecret: (provider: ExternalTrackingProvider): ExternalTrackingAccountSecretRow | null => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.getAccountSecret",
			() => selectExternalTrackingAccountSecret(provider),
			{ provider },
		);
	},

	listAccountSecrets: (): ExternalTrackingAccountSecretRow[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.listAccountSecrets",
			() => selectAllExternalTrackingAccountSecrets(),
		);
	},

	updateAccountSecrets: (accounts: Parameters<typeof updateExternalTrackingAccountSecrets>[0]): void => {
		runUserDbFacadeOperation(
			"user-db.facade.externalTracking.updateAccountSecrets",
			() => updateExternalTrackingAccountSecrets(accounts),
			{ accountsCount: accounts.length },
		);
	},

	savePendingConnection: (params: Parameters<typeof upsertExternalTrackingPendingConnection>[0]): ExternalTrackingAccount => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.savePendingConnection",
			() => upsertExternalTrackingPendingConnection(params),
			{ provider: params.provider },
		);
	},

	completeAccount: (params: Parameters<typeof completeExternalTrackingAccount>[0]): ExternalTrackingAccount => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.completeAccount",
			() => completeExternalTrackingAccount(params),
			{ provider: params.provider },
		);
	},

	disconnectAccount: (provider: ExternalTrackingProvider): void => {
		runUserDbFacadeOperation(
			"user-db.facade.externalTracking.disconnectAccount",
			() => disconnectExternalTrackingAccount(provider),
			{ provider },
		);
	},

	markAccountError: (provider: ExternalTrackingProvider, errorMessage: string): void => {
		runUserDbFacadeOperation(
			"user-db.facade.externalTracking.markAccountError",
			() => markExternalTrackingAccountError(
				provider,
				errorMessage,
			),
			{ provider },
		);
	},
} as const;
