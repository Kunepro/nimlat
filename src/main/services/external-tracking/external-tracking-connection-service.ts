import { BUS_ExternalTrackingAccountsChanged } from "@nimlat/busses/main";
import {
	type ExternalTrackingAccountSecretRow,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingAccount,
	ExternalTrackingActionResult,
	ExternalTrackingProvider,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
	StartExternalTrackingConnectionResult,
} from "@nimlat/types/external-tracking";
import {
	BrowserWindow,
	shell,
} from "electron";
import {
	exchangeExternalTrackingPkceCode,
	getExternalTrackingJwtExpiresAt,
	getExternalTrackingProviderLabel,
	getExternalTrackingTokenExpiresAt,
	parseExternalTrackingImplicitTokenOrRaw,
	parseExternalTrackingPkceRedirect,
	prepareExternalTrackingPkceConnection,
	sanitizeExternalTrackingInput,
} from "./external-tracking-auth-flow";
import { exchangeKitsuPassword } from "./external-tracking-kitsu-auth";
import {
	disposeExternalTrackingLoopbackCallback,
	startExternalTrackingLoopbackCallback,
} from "./external-tracking-loopback-callback";
import { getExternalTrackingProviderClient } from "./external-tracking-provider-clients";
import {
	decryptExternalTrackingAccountSecret,
	encryptExternalTrackingSecret,
	getExternalTrackingSecretStorageStatus,
	isExternalTrackingPlaintextE2eMode,
} from "./external-tracking-secret-storage";

function publishExternalTrackingAccountChanged(provider: ExternalTrackingProvider): void {
	BUS_ExternalTrackingAccountsChanged.next({ provider });
}

// The system browser owns the authorization screen. Bring the existing desktop
// window back after the loopback callback instead of making the user hunt for it.
function focusNimlatWindow(): void {
	const window = BrowserWindow.getAllWindows().find(candidate => !candidate.isDestroyed());
	if (!window) {
		return;
	}
	if (window.isMinimized()) {
		window.restore();
	}
	window.show();
	window.focus();
}

interface CompletePkceConnectionRequest {
	provider: Extract<ExternalTrackingProvider, "mal" | "simkl">;
	redirectResult: string;
}

export async function startExternalTrackingConnection(
	request: StartExternalTrackingConnectionRequest,
): Promise<StartExternalTrackingConnectionResult> {
	const connection        = prepareExternalTrackingPkceConnection(request);
	const encryptedVerifier = encryptExternalTrackingSecret(connection.codeVerifier);
	try {
		await startExternalTrackingLoopbackCallback({
			providerLabel: getExternalTrackingProviderLabel(connection.provider),
			redirectUri:   connection.redirectUri,
			onRedirect:    async (redirectResult) => {
				try {
					await completeExternalTrackingConnection({
						provider: connection.provider,
						redirectResult,
					});
				} catch (error) {
					const typedError = typeSafeError(error);
					UserDbFacade.externalTracking.markAccountError(
						connection.provider,
						typedError.message,
					);
					LoggerUtils.logMainServiceError(
						"external-tracking.loopback-callback",
						typedError,
						{ provider: connection.provider },
					);
					publishExternalTrackingAccountChanged(connection.provider);
					throw typedError;
				}
			},
		});
		UserDbFacade.externalTracking.savePendingConnection({
			provider:     connection.provider,
			authKind:     "pkce",
			clientId:     connection.clientId,
			codeVerifier: encryptedVerifier ?? "",
			state:        connection.state,
			redirectUri:  connection.redirectUri,
		});
		publishExternalTrackingAccountChanged(connection.provider);
		await shell.openExternal(connection.authUrl);
	} catch (error) {
		await disposeExternalTrackingLoopbackCallback();
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"external-tracking.connection-start",
			typedError,
			{ provider: connection.provider },
		);
		throw typedError;
	}

	return {
		provider: connection.provider,
		authUrl:  connection.authUrl,
		state:    connection.state,
	};
}

async function completeExternalTrackingConnection(
	request: CompletePkceConnectionRequest,
): Promise<ExternalTrackingAccount> {
	const account = UserDbFacade.externalTracking.getAccountSecret(request.provider);
	if (!account?.clientId || !account.pendingCodeVerifier || !account.pendingRedirectUri) {
		throw new Error(`Start a ${ getExternalTrackingProviderLabel(request.provider) } connection before completing it.`);
	}
	const decryptedAccount = decryptExternalTrackingAccountSecret(account);

	const redirect      = parseExternalTrackingPkceRedirect({
		provider:       request.provider,
		redirectResult: request.redirectResult,
		expectedState:  account.pendingState,
	});
	const tokenResponse = await exchangeExternalTrackingPkceCode({
		provider:     request.provider,
		clientId:     account.clientId,
		code:         redirect.code,
		codeVerifier: decryptedAccount.pendingCodeVerifier ?? "",
		redirectUri:  account.pendingRedirectUri,
	});
	if (typeof tokenResponse.access_token !== "string") {
		throw new Error(`${ getExternalTrackingProviderLabel(request.provider) } did not return an access token.`);
	}

	const connected = UserDbFacade.externalTracking.completeAccount({
		provider:       request.provider,
		authKind:       "pkce",
		clientId:       account.clientId,
		accessToken:    encryptExternalTrackingSecret(tokenResponse.access_token) ?? "",
		refreshToken:   typeof tokenResponse.refresh_token === "string"
											? encryptExternalTrackingSecret(tokenResponse.refresh_token)
											: null,
		tokenExpiresAt: getExternalTrackingTokenExpiresAt(tokenResponse.expires_in),
	});
	publishExternalTrackingAccountChanged(request.provider);
	focusNimlatWindow();

	return connected;
}

export async function saveExternalTrackingImplicitToken(
	request: SaveExternalTrackingTokenRequest,
): Promise<ExternalTrackingAccount> {
	const clientId                                           = sanitizeExternalTrackingInput(request.clientId);
	const implicitToken                                      = parseExternalTrackingImplicitTokenOrRaw(request.tokenOrRedirectUrl);
	const expiresInSeconds                                   = request.expiresInSeconds ?? implicitToken.expiresInSeconds;
	const tokenExpiresAt                                     = expiresInSeconds == null
		? getExternalTrackingJwtExpiresAt(implicitToken.token)
		: getExternalTrackingTokenExpiresAt(expiresInSeconds);
	const candidateAccount: ExternalTrackingAccountSecretRow = {
		provider:            request.provider,
		status:              "connected",
		authKind:            "implicit",
		clientId,
		accessToken:         implicitToken.token,
		refreshToken:        null,
		tokenExpiresAt,
		publicProfileIdentifier: null,
		pendingCodeVerifier: null,
		pendingState:        null,
		pendingRedirectUri:  null,
		lastImportedAt:      null,
		lastError:           null,
		updatedAt:           Date.now(),
	};
	await getExternalTrackingProviderClient(request.provider).testConnection?.(candidateAccount);

	const account = UserDbFacade.externalTracking.completeAccount({
		provider:       request.provider,
		clientId,
		accessToken:    encryptExternalTrackingSecret(implicitToken.token) ?? "",
		refreshToken:   null,
		tokenExpiresAt,
	});
	publishExternalTrackingAccountChanged(request.provider);

	return account;
}

export async function connectKitsuWithPassword(
	request: ConnectKitsuPasswordRequest,
): Promise<ExternalTrackingAccount> {
	const email = sanitizeExternalTrackingInput(request.email);
	try {
		if (email.length === 0 || request.password.length === 0) {
			throw new Error("Kitsu email and password are required.");
		}
		const secretStorage = getExternalTrackingSecretStorageStatus();
		// The deterministic Electron E2E sandbox has no OS keychain by design;
		// production never sets its plaintext-only test flag.
		if (secretStorage.security === "plaintext" && !isExternalTrackingPlaintextE2eMode()) {
			throw new Error("Kitsu requires secure OS credential storage because its refresh token must not be saved in plaintext.");
		}

		const tokens                                             = await exchangeKitsuPassword(
			email,
			request.password,
		);
		const candidateAccount: ExternalTrackingAccountSecretRow = {
			provider:                "kitsu",
			status:                  "connected",
			authKind:                "password",
			clientId:                null,
			accessToken:             tokens.accessToken,
			refreshToken:            tokens.refreshToken,
			tokenExpiresAt:          tokens.tokenExpiresAt,
			publicProfileIdentifier: null,
			pendingCodeVerifier:     null,
			pendingState:            null,
			pendingRedirectUri:      null,
			lastImportedAt:          null,
			lastError:               null,
			updatedAt:               Date.now(),
		};
		await getExternalTrackingProviderClient("kitsu").testConnection?.(candidateAccount);

		const connected = UserDbFacade.externalTracking.completeAccount({
			provider:       "kitsu",
			authKind:       "password",
			clientId:       null,
			accessToken:    encryptExternalTrackingSecret(tokens.accessToken) ?? "",
			refreshToken:   encryptExternalTrackingSecret(tokens.refreshToken),
			tokenExpiresAt: tokens.tokenExpiresAt,
		});
		publishExternalTrackingAccountChanged("kitsu");
		return connected;
	} finally {
		// This is the main-process structured-clone copy. Clearing it shortens the
		// lifetime of the plaintext credential even though it was never persisted.
		request.password = "";
	}
}

export function disconnectExternalTrackingProvider(provider: ExternalTrackingProvider): ExternalTrackingActionResult {
	UserDbFacade.externalTracking.disconnectAccount(provider);
	publishExternalTrackingAccountChanged(provider);
	return {
		success: true,
		message: `${ getExternalTrackingProviderLabel(provider) } disconnected.`,
	};
}
