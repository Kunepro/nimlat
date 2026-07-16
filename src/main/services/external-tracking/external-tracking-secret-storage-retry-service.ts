import { UserDbFacade } from "@nimlat/database";
import type { ExternalTrackingSecretStorageStatus } from "@nimlat/types/external-tracking";
import {
	encryptExternalTrackingSecret,
	requestExternalTrackingSecretStorageAccess,
	resetExternalTrackingSecretStorageAccessVerification,
} from "./external-tracking-secret-storage";

// Keychain recovery also upgrades prior plaintext fallback values. All encryption
// finishes before the DB facade opens its atomic update, so failure preserves the
// original readable account rows and leaves the retry action available.
export function retryExternalTrackingSecretStorage(): ExternalTrackingSecretStorageStatus {
	const status = requestExternalTrackingSecretStorageAccess();
	if (status.security !== "os_encrypted") {
		return status;
	}

	try {
		const storedAccounts = UserDbFacade.externalTracking.listAccountSecrets();
		const updatedSecrets = storedAccounts
			.map(account => ({
				provider:            account.provider,
				accessToken:         encryptExternalTrackingSecret(account.accessToken),
				refreshToken:        encryptExternalTrackingSecret(account.refreshToken),
				pendingCodeVerifier: encryptExternalTrackingSecret(account.pendingCodeVerifier),
			}))
			.filter((account, index) => {
				const original = storedAccounts[ index ];
				if (!original) {
					return true;
				}

				return account.accessToken !== original.accessToken
					|| account.refreshToken !== original.refreshToken
					|| account.pendingCodeVerifier !== original.pendingCodeVerifier;
			});

		UserDbFacade.externalTracking.updateAccountSecrets(updatedSecrets);
		return status;
	} catch (error: unknown) {
		resetExternalTrackingSecretStorageAccessVerification();
		throw error;
	}
}
