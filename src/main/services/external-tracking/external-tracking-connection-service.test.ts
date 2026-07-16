// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	accountsChangedNext:                     vi.fn(),
	completeAccount:                         vi.fn(),
	decryptExternalTrackingAccountSecret:    vi.fn(),
	encryptExternalTrackingSecret:           vi.fn(),
	exchangeExternalTrackingPkceCode:        vi.fn(),
	exchangeKitsuPassword:                  vi.fn(),
	getAccountSecret:                        vi.fn(),
	getExternalTrackingProviderClient:       vi.fn(),
	getExternalTrackingProviderLabel:        vi.fn(),
	getExternalTrackingJwtExpiresAt:        vi.fn(),
	getExternalTrackingSecretStorageStatus: vi.fn(),
	isExternalTrackingPlaintextE2eMode:     vi.fn(),
	getExternalTrackingTokenExpiresAt:       vi.fn(),
	loopbackRedirectHandler:                null as null | ((redirectResult: string) => Promise<void>),
	logMainServiceError:                    vi.fn(),
	markAccountError:                       vi.fn(),
	openExternal:                            vi.fn(),
	parseExternalTrackingImplicitTokenOrRaw: vi.fn(),
	parseExternalTrackingPkceRedirect:       vi.fn(),
	prepareExternalTrackingPkceConnection:   vi.fn(),
	sanitizeExternalTrackingInput:           vi.fn(),
	savePendingConnection:                   vi.fn(),
	startLoopbackCallback:                  vi.fn(),
	testConnection:                          vi.fn(),
}));

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_ExternalTrackingAccountsChanged: {
			next: mocks.accountsChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: {
				completeAccount:       mocks.completeAccount,
				getAccountSecret:      mocks.getAccountSecret,
				markAccountError: mocks.markAccountError,
				savePendingConnection: mocks.savePendingConnection,
			},
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		BrowserWindow: {
			getAllWindows: () => [],
		},
		shell: {
			openExternal: mocks.openExternal,
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({ LoggerUtils: { logMainServiceError: mocks.logMainServiceError } }),
);

vi.mock(
	"./external-tracking-auth-flow",
	() => ({
		exchangeExternalTrackingPkceCode:        mocks.exchangeExternalTrackingPkceCode,
		getExternalTrackingJwtExpiresAt: mocks.getExternalTrackingJwtExpiresAt,
		getExternalTrackingProviderLabel:        mocks.getExternalTrackingProviderLabel,
		getExternalTrackingTokenExpiresAt:       mocks.getExternalTrackingTokenExpiresAt,
		parseExternalTrackingImplicitTokenOrRaw: mocks.parseExternalTrackingImplicitTokenOrRaw,
		parseExternalTrackingPkceRedirect:       mocks.parseExternalTrackingPkceRedirect,
		prepareExternalTrackingPkceConnection:   mocks.prepareExternalTrackingPkceConnection,
		sanitizeExternalTrackingInput:           mocks.sanitizeExternalTrackingInput,
	}),
);

vi.mock(
	"./external-tracking-kitsu-auth",
	() => ({ exchangeKitsuPassword: mocks.exchangeKitsuPassword }),
);

vi.mock(
	"./external-tracking-loopback-callback",
	() => ({
		disposeExternalTrackingLoopbackCallback: vi.fn(),
		startExternalTrackingLoopbackCallback:   mocks.startLoopbackCallback,
	}),
);

vi.mock(
	"./external-tracking-provider-clients",
	() => ({
		getExternalTrackingProviderClient: mocks.getExternalTrackingProviderClient,
	}),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		decryptExternalTrackingAccountSecret: mocks.decryptExternalTrackingAccountSecret,
		encryptExternalTrackingSecret:        mocks.encryptExternalTrackingSecret,
		getExternalTrackingSecretStorageStatus: mocks.getExternalTrackingSecretStorageStatus,
		isExternalTrackingPlaintextE2eMode:     mocks.isExternalTrackingPlaintextE2eMode,
	}),
);

describe(
	"external-tracking-connection-service",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			mocks.encryptExternalTrackingSecret.mockImplementation((value: string | null | undefined) => value
				? `encrypted:${ value }`
				: null);
			mocks.getExternalTrackingProviderLabel.mockImplementation((provider: string) => provider);
			mocks.getExternalTrackingProviderClient.mockReturnValue({ testConnection: mocks.testConnection });
			mocks.getExternalTrackingTokenExpiresAt.mockReturnValue(123_000);
			mocks.getExternalTrackingSecretStorageStatus.mockReturnValue({ security: "os_encrypted" });
			mocks.isExternalTrackingPlaintextE2eMode.mockReturnValue(false);
			mocks.sanitizeExternalTrackingInput.mockImplementation((value: string) => value.trim());
			mocks.loopbackRedirectHandler = null;
			mocks.startLoopbackCallback.mockImplementation((options: {
				onRedirect: (redirectResult: string) => Promise<void>
			}) => {
				mocks.loopbackRedirectHandler = options.onRedirect;
				return Promise.resolve();
			});
		});

		it(
			"starts a PKCE connection, persists encrypted verifier state, and opens the provider auth URL",
			async () => {
				mocks.prepareExternalTrackingPkceConnection.mockReturnValue({
					provider:     "mal",
					clientId:     "mal-client",
					codeVerifier: "verifier",
					state:        "oauth-state",
					redirectUri: "http://127.0.0.1:8765/callback",
					authUrl:      "https://provider.example/auth",
				});

				const { startExternalTrackingConnection } = await import("./external-tracking-connection-service");
				const result                              = await startExternalTrackingConnection({
					provider:    "mal",
					clientId:    "mal-client",
					redirectUri: "http://127.0.0.1:8765/callback",
				});

				expect(mocks.savePendingConnection).toHaveBeenCalledWith({
					provider:     "mal",
					authKind:     "pkce",
					clientId:     "mal-client",
					codeVerifier: "encrypted:verifier",
					state:        "oauth-state",
					redirectUri: "http://127.0.0.1:8765/callback",
				});
				expect(mocks.accountsChangedNext).toHaveBeenCalledWith({ provider: "mal" });
				expect(mocks.openExternal).toHaveBeenCalledWith("https://provider.example/auth");
				expect(result).toEqual({
					provider: "mal",
					authUrl:  "https://provider.example/auth",
					state:    "oauth-state",
				});
			},
		);

		it(
			"completes a PKCE connection automatically from the loopback callback",
			async () => {
				mocks.prepareExternalTrackingPkceConnection.mockReturnValue({
					provider:     "simkl",
					clientId:     "simkl-client",
					codeVerifier: "verifier",
					state:        "expected-state",
					redirectUri:  "http://127.0.0.1:8765/callback",
					authUrl:      "https://simkl.com/oauth/authorize",
				});
				mocks.getAccountSecret.mockReturnValue({
					provider:            "simkl",
					status:              "connected",
					authKind:            "pkce",
					clientId:            "simkl-client",
					accessToken:         null,
					refreshToken:        null,
					tokenExpiresAt:      null,
					pendingCodeVerifier: "encrypted-verifier",
					pendingState:        "expected-state",
					pendingRedirectUri: "http://127.0.0.1:8765/callback",
					lastImportedAt:      null,
					lastError:           null,
					updatedAt:           1,
				});
				mocks.decryptExternalTrackingAccountSecret.mockReturnValue({ pendingCodeVerifier: "verifier" });
				mocks.parseExternalTrackingPkceRedirect.mockReturnValue({ code: "oauth-code" });
				mocks.exchangeExternalTrackingPkceCode.mockResolvedValue({
					access_token:  "access-token",
					refresh_token: "refresh-token",
					expires_in:    3600,
				});
				mocks.completeAccount.mockReturnValue({
					provider: "simkl",
					status:   "connected",
				});

				const { startExternalTrackingConnection } = await import("./external-tracking-connection-service");
				await startExternalTrackingConnection({
					provider:    "simkl",
					clientId:    "simkl-client",
					redirectUri: "http://127.0.0.1:8765/callback",
				});
				await mocks.loopbackRedirectHandler?.("http://127.0.0.1:8765/callback?code=oauth-code&state=expected-state");

				expect(mocks.exchangeExternalTrackingPkceCode).toHaveBeenCalledWith({
					provider:     "simkl",
					clientId:     "simkl-client",
					code:         "oauth-code",
					codeVerifier: "verifier",
					redirectUri: "http://127.0.0.1:8765/callback",
				});
				expect(mocks.completeAccount).toHaveBeenCalledWith({
					provider:       "simkl",
					authKind:       "pkce",
					clientId:       "simkl-client",
					accessToken:    "encrypted:access-token",
					refreshToken:   "encrypted:refresh-token",
					tokenExpiresAt: 123_000,
				});
				expect(mocks.accountsChangedNext).toHaveBeenCalledWith({ provider: "simkl" });
			},
		);

		it(
			"exchanges a transient Kitsu password and persists only encrypted OAuth tokens",
			async () => {
				mocks.exchangeKitsuPassword.mockResolvedValue({
					accessToken:    "kitsu-access",
					refreshToken:   "kitsu-refresh",
					tokenExpiresAt: 456_000,
				});
				mocks.completeAccount.mockReturnValue({
					provider: "kitsu",
					status:   "connected",
				});
				const request = {
					provider: "kitsu" as const,
					email:    " user@example.com ",
					password: "plain-password",
				};

				const { connectKitsuWithPassword } = await import("./external-tracking-connection-service");
				await expect(connectKitsuWithPassword(request)).resolves.toMatchObject({ provider: "kitsu" });

				expect(mocks.exchangeKitsuPassword).toHaveBeenCalledWith(
					"user@example.com",
					"plain-password",
				);
				expect(mocks.testConnection).toHaveBeenCalledWith(expect.objectContaining({
					accessToken:  "kitsu-access",
					refreshToken: "kitsu-refresh",
				}));
				expect(mocks.completeAccount).toHaveBeenCalledWith({
					provider:       "kitsu",
					authKind:       "password",
					clientId:       null,
					accessToken:    "encrypted:kitsu-access",
					refreshToken:   "encrypted:kitsu-refresh",
					tokenExpiresAt: 456_000,
				});
				expect(request.password).toBe("");
			},
		);

		it(
			"refuses Kitsu password auth when only plaintext token storage is available",
			async () => {
				mocks.getExternalTrackingSecretStorageStatus.mockReturnValue({ security: "plaintext" });
				const request                      = {
					provider: "kitsu" as const,
					email:    "user@example.com",
					password: "plain-password",
				};
				const { connectKitsuWithPassword } = await import("./external-tracking-connection-service");

				await expect(connectKitsuWithPassword(request)).rejects.toThrow(/secure OS credential storage/u);
				expect(mocks.exchangeKitsuPassword).not.toHaveBeenCalled();
				expect(request.password).toBe("");
			},
		);

		it(
			"validates an implicit token before saving its encrypted value",
			async () => {
				mocks.parseExternalTrackingImplicitTokenOrRaw.mockReturnValue({
					token:            "raw-token",
					expiresInSeconds: 3600,
				});
				mocks.completeAccount.mockReturnValue({
					provider: "anilist",
					status:   "connected",
				});

				const { saveExternalTrackingImplicitToken } = await import("./external-tracking-connection-service");
				const account                               = await saveExternalTrackingImplicitToken({
					provider:           "anilist",
					clientId:           " ani-client ",
					tokenOrRedirectUrl: " raw-token ",
				});

				expect(mocks.testConnection).toHaveBeenCalledWith(expect.objectContaining({
					provider:    "anilist",
					clientId:    "ani-client",
					accessToken: "raw-token",
				}));
				expect(mocks.completeAccount).toHaveBeenCalledWith({
					provider:       "anilist",
					clientId:       "ani-client",
					accessToken:    "encrypted:raw-token",
					refreshToken:   null,
					tokenExpiresAt: 123_000,
				});
				expect(mocks.accountsChangedNext).toHaveBeenCalledWith({ provider: "anilist" });
				expect(account).toEqual({
					provider: "anilist",
					status:   "connected",
				});
			},
		);

		it(
			"persists the expiry embedded in a pasted AniList JWT",
			async () => {
				mocks.parseExternalTrackingImplicitTokenOrRaw.mockReturnValue({
					token:            "jwt-token",
					expiresInSeconds: null,
				});
				mocks.getExternalTrackingJwtExpiresAt.mockReturnValue(456_000);
				mocks.completeAccount.mockReturnValue({
					provider: "anilist",
					status:   "connected",
				});

				const { saveExternalTrackingImplicitToken } = await import("./external-tracking-connection-service");
				await saveExternalTrackingImplicitToken({
					provider:           "anilist",
					clientId:           "ani-client",
					tokenOrRedirectUrl: "jwt-token",
				});

				expect(mocks.getExternalTrackingJwtExpiresAt).toHaveBeenCalledWith("jwt-token");
				expect(mocks.completeAccount).toHaveBeenCalledWith(expect.objectContaining({
					tokenExpiresAt: 456_000,
				}));
			},
		);
	},
);
