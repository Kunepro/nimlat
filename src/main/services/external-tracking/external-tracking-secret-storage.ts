import { PATH_USER_DB } from "@nimlat/constants/main/system-folders";
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type { ExternalTrackingSecretStorageStatus } from "@nimlat/types/external-tracking";
import { safeStorage } from "electron";

const SAFE_STORAGE_PREFIX = "electron-safe-storage:v1:";
const SAFE_STORAGE_PROBE_VALUE = "nimlat-external-tracking-safe-storage-check";
const E2E_FORCE_PLAINTEXT_SECRET_STORAGE = "NIMLAT_E2E_FORCE_PLAINTEXT_SECRET_STORAGE";

export function isExternalTrackingPlaintextE2eMode(): boolean {
	return process.env[ E2E_FORCE_PLAINTEXT_SECRET_STORAGE ] === "1";
}

type SafeStorageAccess = "unknown" | "granted" | "denied";

let safeStorageAccess: SafeStorageAccess = "unknown";

function isEncryptedSecret(value: string): boolean {
	return value.startsWith(SAFE_STORAGE_PREFIX);
}

function getOsStorageLabel(backend: string | null): string {
	if (process.platform === "darwin") {
		return "macOS Keychain";
	}
	if (process.platform === "win32") {
		return "Windows Data Protection API";
	}
	if (process.platform === "linux") {
		if (backend === "gnome_libsecret") {
			return "Linux Secret Service";
		}
		if (backend === "kwallet") {
			return "KWallet";
		}
		if (backend) {
			return `Linux secure storage (${ backend })`;
		}
		return "Linux secure storage";
	}

	return "OS secure storage";
}

function probeSafeStorage(): boolean {
	try {
		const encrypted = safeStorage.encryptString(SAFE_STORAGE_PROBE_VALUE);
		const succeeded   = safeStorage.decryptString(encrypted) === SAFE_STORAGE_PROBE_VALUE;
		safeStorageAccess = succeeded ? "granted" : "denied";
		return succeeded;
	} catch {
		safeStorageAccess = "denied";
		return false;
	}
}

export function getExternalTrackingSecretStorageStatus(): ExternalTrackingSecretStorageStatus {
	// Electron E2E must stay deterministic and must not depend on OS keychain
	// prompts/backends. Production never sets this flag.
	if (isExternalTrackingPlaintextE2eMode()) {
		return {
			security:            "plaintext",
			encryptionAvailable: false,
			checkedAt:           Date.now(),
			backend:             "e2e_plaintext",
			backendLabel:        "E2E plaintext secret storage",
			storagePath:         PATH_USER_DB,
			retryAvailable: false,
			message:             `E2E secret storage is forced to plaintext in ${ PATH_USER_DB }.`,
			warning:             `E2E secret storage is forced to plaintext in ${ PATH_USER_DB }.`,
		};
	}

	const encryptionAvailable = safeStorage.isEncryptionAvailable();
	const backend             = process.platform === "linux"
		? safeStorage.getSelectedStorageBackend()
		: null;
	const checkedAt           = Date.now();
	if (process.platform === "darwin" && safeStorageAccess === "denied") {
		const backendLabel = getOsStorageLabel(backend);

		return {
			security:       "plaintext",
			encryptionAvailable,
			checkedAt,
			backend,
			backendLabel,
			storagePath:    PATH_USER_DB,
			retryAvailable: true,
			message:        `${ backendLabel } access was not granted. Nimlat cannot safely save new tracking credentials until access is approved.`,
			warning:        `Existing plaintext tracking credentials, if any, remain in ${ PATH_USER_DB } until secure storage access is restored.`,
		};
	}

	// Treat Electron's Linux basic_text backend as unsafe for account tokens. It
	// is useful as an Electron fallback, but Nimlat should ask users to make an
	// informed plaintext-storage decision instead of implying real OS protection.
	if (!encryptionAvailable || backend === "basic_text") {
		if (process.platform === "darwin") {
			const backendLabel = getOsStorageLabel(backend);
			return {
				security:       "plaintext",
				encryptionAvailable,
				checkedAt,
				backend,
				backendLabel,
				storagePath:    PATH_USER_DB,
				retryAvailable: true,
				message:        "macOS Keychain is unavailable. Nimlat will not save new tracking credentials in plaintext.",
				warning:        `Existing plaintext tracking credentials, if any, remain in ${ PATH_USER_DB } until secure storage access is restored.`,
			};
		}

		return {
			security:       "plaintext",
			encryptionAvailable,
			checkedAt,
			backend,
			backendLabel:   backend === "basic_text" ? "Linux basic_text fallback" : "No safe OS credential storage",
			storagePath:    PATH_USER_DB,
			retryAvailable: false,
			message:        `Safe OS credential storage is not available. Credentials will be stored in plaintext in ${ PATH_USER_DB }.`,
			warning:        `Not possible to connect with safe storage. Credentials will be stored in ${ PATH_USER_DB } in plaintext.`,
		};
	}

	// Accessing macOS Keychain can display a system prompt. Passive settings reads
	// must describe the reason first and leave that prompt behind an explicit action.
	if (process.platform === "darwin" && safeStorageAccess === "unknown") {
		const backendLabel = getOsStorageLabel(backend);

		return {
			security:       "access_required",
			encryptionAvailable,
			checkedAt,
			backend,
			backendLabel,
			storagePath:    PATH_USER_DB,
			retryAvailable: true,
			message: `Allow ${ backendLabel } access to encrypt passwords and access tokens used for watched-list import and export.`,
			warning:        null,
		};
	}

	const probeSucceeded = safeStorageAccess === "granted"
		|| (process.platform !== "darwin" && probeSafeStorage());
	if (!probeSucceeded) {
		const backendLabel = getOsStorageLabel(backend);

		return {
			security:    "plaintext",
			encryptionAvailable,
			checkedAt,
			backend,
			backendLabel,
			storagePath: PATH_USER_DB,
			retryAvailable: process.platform === "darwin",
			message:        `${ backendLabel } access was not granted. Nimlat cannot safely save new tracking credentials until access is approved.`,
			warning:        `Existing plaintext tracking credentials, if any, remain in ${ PATH_USER_DB } until secure storage access is restored.`,
		};
	}

	const backendLabel = getOsStorageLabel(backend);

	return {
		security:    "os_encrypted",
		encryptionAvailable,
		checkedAt,
		backend,
		backendLabel,
		storagePath: null,
		retryAvailable: false,
		message:        `Credentials are stored safely in ${ backendLabel }.`,
		warning:     null,
	};
}

function hasStoredPlaintextSecrets(accounts: ReadonlyArray<Pick<
	ExternalTrackingAccountSecretRow,
	"accessToken" | "refreshToken" | "pendingCodeVerifier"
>>): boolean {
	return accounts.some(account => [
		account.accessToken,
		account.refreshToken,
		account.pendingCodeVerifier,
	].some(secret => typeof secret === "string" && secret.length > 0 && !isEncryptedSecret(secret)));
}

// Backend availability alone does not prove that existing account rows are
// protected. Settings uses this DB-aware projection so it never shows a success
// banner while a token from an earlier plaintext fallback still needs migration.
export function getExternalTrackingSecretStorageStatusForAccounts(
	accounts: ReadonlyArray<Pick<
		ExternalTrackingAccountSecretRow,
		"accessToken" | "refreshToken" | "pendingCodeVerifier"
	>>,
): ExternalTrackingSecretStorageStatus {
	const status                 = getExternalTrackingSecretStorageStatus();
	const plaintextSecretsStored = hasStoredPlaintextSecrets(accounts);
	if (!plaintextSecretsStored || status.security !== "os_encrypted") {
		return plaintextSecretsStored
			? {
				...status,
				plaintextSecretsStored: true,
			}
			: status;
	}

	return {
		...status,
		security:               "plaintext",
		plaintextSecretsStored: true,
		retryAvailable:         true,
		storagePath:            PATH_USER_DB,
		message:                "Some tracking credentials are still stored in plaintext.",
		warning:                `Use ${ status.backendLabel } to protect them. Until then, they remain readable in ${ PATH_USER_DB }.`,
	};
}

// This is the only UI-triggered probe on macOS. Calling it immediately after the
// explanatory Preferences action keeps the native Keychain prompt contextual.
export function requestExternalTrackingSecretStorageAccess(): ExternalTrackingSecretStorageStatus {
	if (!isExternalTrackingPlaintextE2eMode()) {
		probeSafeStorage();
	}

	return getExternalTrackingSecretStorageStatus();
}

// A failed plaintext-to-Keychain migration must make the explicit action visible
// again even though the OS probe itself succeeded.
export function resetExternalTrackingSecretStorageAccessVerification(): void {
	safeStorageAccess = "unknown";
}

export function encryptExternalTrackingSecret(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	if (isEncryptedSecret(value)) {
		return value;
	}
	// Unmarked values intentionally represent an accepted plaintext fallback on
	// platforms that allow it. macOS blocks new plaintext values but still reads
	// existing ones so Keychain recovery can migrate them without data loss.
	const storageStatus = getExternalTrackingSecretStorageStatus();
	if (safeStorageAccess === "denied") {
		throw new Error(`${ getOsStorageLabel(null) } access was not granted. Use the secure-storage retry in Watched preferences.`);
	}
	if (storageStatus.security === "plaintext") {
		if (process.platform === "darwin" && process.env[ E2E_FORCE_PLAINTEXT_SECRET_STORAGE ] !== "1") {
			throw new Error("macOS Keychain is unavailable. Nimlat will not save tracking credentials in plaintext.");
		}
		return value;
	}

	try {
		const encrypted   = safeStorage.encryptString(value);
		safeStorageAccess = "granted";
		return `${ SAFE_STORAGE_PREFIX }${ encrypted.toString("base64") }`;
	} catch {
		safeStorageAccess = "denied";
		throw new Error(`${ getOsStorageLabel(null) } access was not granted. Use the secure-storage retry in Watched preferences.`);
	}
}

export function decryptExternalTrackingSecret(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	if (!isEncryptedSecret(value)) {
		return value;
	}
	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error("Secure OS storage is unavailable, so Nimlat cannot read the encrypted tracking credentials.");
	}

	try {
		const decrypted   = safeStorage.decryptString(Buffer.from(
			value.slice(SAFE_STORAGE_PREFIX.length),
			"base64",
		));
		safeStorageAccess = "granted";
		return decrypted;
	} catch {
		safeStorageAccess = "denied";
		throw new Error(`${ getOsStorageLabel(null) } access was not granted. Use the secure-storage retry in Watched preferences.`);
	}
}

export function decryptExternalTrackingAccountSecret(account: ExternalTrackingAccountSecretRow): ExternalTrackingAccountSecretRow {
	return {
		...account,
		accessToken:         decryptExternalTrackingSecret(account.accessToken),
		refreshToken:        decryptExternalTrackingSecret(account.refreshToken),
		pendingCodeVerifier: decryptExternalTrackingSecret(account.pendingCodeVerifier),
	};
}
