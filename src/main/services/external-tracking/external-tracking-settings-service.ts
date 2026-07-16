import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import { getExternalTrackingJwtExpiresAt } from "./external-tracking-auth-flow";
import { EXTERNAL_TRACKING_PROVIDER_CAPABILITIES } from "./external-tracking-providers";
import {
	decryptExternalTrackingAccountSecret,
	getExternalTrackingSecretStorageStatusForAccounts,
} from "./external-tracking-secret-storage";

const PUBLIC_TRACKING_PROVIDERS: ExternalTrackingProvider[] = [
	"mal",
	"anilist",
	"simkl",
	"kitsu",
];

function mergeAccountDefaults(accounts: ExternalTrackingAccount[]): ExternalTrackingAccount[] {
	const byProvider = new Map(accounts.map(account => [
		account.provider,
		account,
	]));

	return PUBLIC_TRACKING_PROVIDERS.map((provider) => {
		const saved        = byProvider.get(provider);
		const capabilities = EXTERNAL_TRACKING_PROVIDER_CAPABILITIES[ provider ];
		if (saved) {
			return {
				...saved,
				capabilities: {
					...capabilities,
					canExport: capabilities.canExport && saved.status === "connected",
				},
			};
		}

		return {
			provider,
			status: "available",
			capabilities,
		};
	});
}

function addKnownAniListTokenExpiry(
	accounts: ExternalTrackingAccount[],
	accountSecrets: ReturnType<typeof UserDbFacade.externalTracking.listAccountSecrets>,
	canDecryptSecrets: boolean,
): ExternalTrackingAccount[] {
	const account = accounts.find(candidate => candidate.provider === "anilist");
	if (!canDecryptSecrets || !account || account.status !== "connected" || account.tokenExpiresAt) {
		return accounts;
	}
	const secret = accountSecrets.find(candidate => candidate.provider === "anilist");
	if (!secret?.accessToken) {
		return accounts;
	}
	try {
		const accessToken = decryptExternalTrackingAccountSecret(secret).accessToken;
		const expiresAt   = accessToken ? getExternalTrackingJwtExpiresAt(accessToken) : null;
		return expiresAt
			? accounts.map(candidate => candidate.provider === "anilist"
				? {
					...candidate,
					tokenExpiresAt: expiresAt,
				}
				: candidate)
			: accounts;
	} catch (error) {
		// Expiry metadata must never make the settings page unavailable when the
		// secure-store token cannot be read. Authentication actions retain their
		// existing error path for an actually unusable credential.
		LoggerUtils.logMainServiceError(
			"external-tracking.settings.derive-anilist-expiry",
			typeSafeError(error),
			{ provider: "anilist" },
		);
		return accounts;
	}
}

// Settings are renderer-facing snapshots assembled from DB state and static provider capabilities.
export function getExternalTrackingSettings(): ExternalTrackingSettings {
	const accountSecrets = UserDbFacade.externalTracking.listAccountSecrets();
	const secretStorage  = getExternalTrackingSecretStorageStatusForAccounts(accountSecrets);
	const accounts       = addKnownAniListTokenExpiry(
		UserDbFacade.externalTracking.listAccounts(),
		accountSecrets,
		secretStorage.security === "os_encrypted",
	);
	return {
		accounts: mergeAccountDefaults(accounts),
		secretStorage,
	};
}
