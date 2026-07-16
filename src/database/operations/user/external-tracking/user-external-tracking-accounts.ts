import type {
	ExternalTrackingAccount,
	ExternalTrackingAuthKind,
	ExternalTrackingProvider,
	ExternalTrackingProviderStatus,
} from "@nimlat/types/external-tracking";
import { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

export interface ExternalTrackingAccountSecretRow {
	provider: ExternalTrackingProvider;
	status: ExternalTrackingProviderStatus;
	authKind: ExternalTrackingAuthKind;
	clientId: string | null;
	accessToken: string | null;
	refreshToken: string | null;
	tokenExpiresAt: number | null;
	publicProfileIdentifier: string | null;
	pendingCodeVerifier: string | null;
	pendingState: string | null;
	pendingRedirectUri: string | null;
	lastImportedAt: number | null;
	lastError: string | null;
	updatedAt: number;
}

// Account rows include secrets for main-process provider clients. Renderer
// consumers only receive the public account DTO mapped here.
function mapAccount(row: ExternalTrackingAccountSecretRow): ExternalTrackingAccount {
	return {
		provider:       row.provider,
		status:         row.status,
		publicProfileIdentifier: row.publicProfileIdentifier,
		clientId:                row.clientId,
		tokenExpiresAt:          row.tokenExpiresAt,
		lastImportedAt:          row.lastImportedAt,
		lastError:      row.lastError,
		capabilities:   {
			canImport:               row.status !== "unsupported",
			canExport:               row.status === "connected",
			supportsEpisodeProgress: row.status !== "unsupported",
			authKind:                row.authKind,
		},
	};
}

function selectAccountSecret(db: Database, provider: ExternalTrackingProvider): ExternalTrackingAccountSecretRow | null {
	const row = db.prepare(`
      SELECT provider,
             status,
             authKind,
             clientId,
             accessToken,
             refreshToken,
             tokenExpiresAt,
             publicProfileIdentifier,
             pendingCodeVerifier,
             pendingState,
             pendingRedirectUri,
             lastImportedAt,
             lastError,
             updatedAt
      FROM externalTrackingAccounts
      WHERE provider = ?
	`).get(provider) as ExternalTrackingAccountSecretRow | undefined;

	return row ?? null;
}

export function selectExternalTrackingAccounts(): ExternalTrackingAccount[] {
	return (getDatabase().prepare(`
      SELECT provider,
             status,
             authKind,
             clientId,
             accessToken,
             refreshToken,
             tokenExpiresAt,
             publicProfileIdentifier,
             pendingCodeVerifier,
             pendingState,
             pendingRedirectUri,
             lastImportedAt,
             lastError,
             updatedAt
      FROM externalTrackingAccounts
      ORDER BY provider ASC
	`).all() as ExternalTrackingAccountSecretRow[]).map(mapAccount);
}

export function selectExternalTrackingAccountSecret(provider: ExternalTrackingProvider): ExternalTrackingAccountSecretRow | null {
	return selectAccountSecret(
		getDatabase(),
		provider,
	);
}

// Secret migration needs every account, including an unfinished PKCE flow whose
// verifier must receive the same at-rest protection as connected account tokens.
export function selectAllExternalTrackingAccountSecrets(): ExternalTrackingAccountSecretRow[] {
	const db = getDatabase();

	return db.prepare(`
      SELECT provider,
             status,
             authKind,
             clientId,
             accessToken,
             refreshToken,
             tokenExpiresAt,
             publicProfileIdentifier,
             pendingCodeVerifier,
             pendingState,
             pendingRedirectUri,
             lastImportedAt,
             lastError,
             updatedAt
      FROM externalTrackingAccounts
      ORDER BY provider ASC
	`).all() as ExternalTrackingAccountSecretRow[];
}

// Replace only secret columns and do so atomically: a failed Keychain recovery
// must never leave an account with a mixture of plaintext and encrypted fields.
export function updateExternalTrackingAccountSecrets(accounts: Array<Pick<
	ExternalTrackingAccountSecretRow,
	"provider" | "accessToken" | "refreshToken" | "pendingCodeVerifier"
>>): void {
	if (accounts.length === 0) {
		return;
	}

	const db        = getDatabase();
	const statement = db.prepare(`
      UPDATE externalTrackingAccounts
      SET accessToken         = ?,
          refreshToken        = ?,
          pendingCodeVerifier = ?
      WHERE provider = ?
	`);
	const updateAll = db.transaction((secretRows: typeof accounts) => {
		for (const account of secretRows) {
			const result = statement.run(
				account.accessToken,
				account.refreshToken,
				account.pendingCodeVerifier,
				account.provider,
			);
			if (result.changes !== 1) {
				throw new Error(`Failed to protect ${ account.provider } tracking credentials.`);
			}
		}
	});

	updateAll(accounts);
}

export function upsertExternalTrackingPendingConnection(params: {
	provider: ExternalTrackingProvider;
	authKind: ExternalTrackingAuthKind;
	clientId: string;
	codeVerifier: string;
	state: string;
	redirectUri: string;
}): ExternalTrackingAccount {
	const now = Date.now();
	getDatabase().prepare(`
      INSERT INTO externalTrackingAccounts (provider,
                                            status,
                                            authKind,
                                            clientId,
                                            pendingCodeVerifier,
                                            pendingState,
                                            pendingRedirectUri,
                                            updatedAt)
      VALUES (?, 'available', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET status              = 'available',
                                          authKind            = excluded.authKind,
                                          clientId            = excluded.clientId,
                                          pendingCodeVerifier = excluded.pendingCodeVerifier,
                                          pendingState        = excluded.pendingState,
                                          pendingRedirectUri  = excluded.pendingRedirectUri,
                                          lastError           = NULL,
                                          updatedAt           = excluded.updatedAt
	`).run(
		params.provider,
		params.authKind,
		params.clientId,
		params.codeVerifier,
		params.state,
		params.redirectUri,
		now,
	);

	const account = selectAccountSecret(
		getDatabase(),
		params.provider,
	);
	if (!account) {
		throw new Error(`Failed to store ${ params.provider } connection state.`);
	}

	return mapAccount(account);
}

export function completeExternalTrackingAccount(params: {
	provider: ExternalTrackingProvider;
	accessToken: string;
	authKind?: ExternalTrackingAuthKind;
	clientId?: string | null;
	refreshToken?: string | null;
	tokenExpiresAt?: number | null;
	publicProfileIdentifier?: string | null;
}): ExternalTrackingAccount {
	const now = Date.now();
	getDatabase().prepare(`
      INSERT INTO externalTrackingAccounts (provider,
                                            status,
                                            authKind,
                                            clientId,
                                            accessToken,
                                            refreshToken,
                                            tokenExpiresAt,
                                            publicProfileIdentifier,
                                            updatedAt)
      VALUES (?, 'connected', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET status              = 'connected',
                                          authKind            = excluded.authKind,
                                          clientId            = COALESCE(excluded.clientId, externalTrackingAccounts.clientId),
                                          accessToken         = excluded.accessToken,
                                          refreshToken        = excluded.refreshToken,
                                          tokenExpiresAt      = excluded.tokenExpiresAt,
                                          publicProfileIdentifier = COALESCE(excluded.publicProfileIdentifier, externalTrackingAccounts.publicProfileIdentifier),
                                          pendingCodeVerifier = NULL,
                                          pendingState        = NULL,
                                          pendingRedirectUri  = NULL,
                                          lastError           = NULL,
                                          updatedAt           = excluded.updatedAt
	`).run(
		params.provider,
		params.authKind ?? "implicit",
		params.clientId ?? null,
		params.accessToken,
		params.refreshToken ?? null,
		params.tokenExpiresAt ?? null,
		params.publicProfileIdentifier ?? null,
		now,
	);

	const account = selectAccountSecret(
		getDatabase(),
		params.provider,
	);
	if (!account) {
		throw new Error(`Failed to connect ${ params.provider } account.`);
	}

	return mapAccount(account);
}

export function disconnectExternalTrackingAccount(provider: ExternalTrackingProvider): void {
	getDatabase().prepare(`
      DELETE
      FROM externalTrackingAccounts
      WHERE provider = ?
	`).run(provider);
}

export function markExternalTrackingAccountError(provider: ExternalTrackingProvider, errorMessage: string): void {
	getDatabase().prepare(`
      UPDATE externalTrackingAccounts
      SET status    = 'needs_reconnect',
          lastError = ?,
          updatedAt = ?
      WHERE provider = ?
	`).run(
		errorMessage,
		Date.now(),
		provider,
	);
}
