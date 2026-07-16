// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const listAccounts                      = vi.fn();
const listAccountSecrets                = vi.fn();
const getSecretStorageStatusForAccounts = vi.fn();
const decryptAccountSecret              = vi.fn();
const getJwtExpiresAt                   = vi.fn();
const logMainServiceError               = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: {
				listAccounts,
				listAccountSecrets,
			},
		},
	}),
);

vi.mock(
	"@nimlat/functions",
	() => ({ typeSafeError: (error: unknown) => error }),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({ LoggerUtils: { logMainServiceError } }),
);

vi.mock(
	"./external-tracking-auth-flow",
	() => ({ getExternalTrackingJwtExpiresAt: getJwtExpiresAt }),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		decryptExternalTrackingAccountSecret:              decryptAccountSecret,
		getExternalTrackingSecretStorageStatusForAccounts: getSecretStorageStatusForAccounts,
	}),
);

describe(
	"getExternalTrackingSettings",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			listAccountSecrets.mockReturnValue([]);
			getSecretStorageStatusForAccounts.mockReturnValue({ security: "os_encrypted" });
			decryptAccountSecret.mockImplementation((account: unknown) => account);
		});

		it(
			"merges saved accounts with public provider defaults and connected export capability",
			async () => {
				listAccounts.mockReturnValue([
					{
						provider: "mal",
						status:   "connected",
					},
					{
						provider: "simkl",
						status:   "available",
					},
				]);

				const { getExternalTrackingSettings } = await import("./external-tracking-settings-service");
				const settings                        = getExternalTrackingSettings();

				expect(settings.accounts.map(account => ({
					provider:  account.provider,
					status:    account.status,
					canExport: account.capabilities.canExport,
				}))).toEqual([
					{
						provider:  "mal",
						status:    "connected",
						canExport: true,
					},
					{
						provider:  "anilist",
						status:    "available",
						canExport: true,
					},
					{
						provider:  "simkl",
						status:    "available",
						canExport: false,
					},
					{
						provider:  "kitsu",
						status:    "available",
						canExport: true,
					},
				]);
				expect(getSecretStorageStatusForAccounts).toHaveBeenCalledWith([]);
				expect(settings.secretStorage).toEqual({ security: "os_encrypted" });
			},
		);

		it(
			"derives a missing AniList expiry from an existing securely stored JWT",
			async () => {
				listAccounts.mockReturnValue([
					{
						provider:       "anilist",
						status:         "connected",
						tokenExpiresAt: null,
					},
				]);
				listAccountSecrets.mockReturnValue([
					{
						provider:    "anilist",
						accessToken: "encrypted-token",
					},
				]);
				decryptAccountSecret.mockReturnValue({ accessToken: "jwt-token" });
				getJwtExpiresAt.mockReturnValue(456_000);

				const { getExternalTrackingSettings } = await import("./external-tracking-settings-service");
				const settings                        = getExternalTrackingSettings();

				expect(decryptAccountSecret).toHaveBeenCalledTimes(1);
				expect(settings.accounts.find(account => account.provider === "anilist")?.tokenExpiresAt).toBe(456_000);
			},
		);

		it(
			"does not request secure-store access solely to display AniList expiry metadata",
			async () => {
				listAccounts.mockReturnValue([
					{
						provider:       "anilist",
						status:         "connected",
						tokenExpiresAt: null,
					},
				]);
				listAccountSecrets.mockReturnValue([
					{
						provider:    "anilist",
						accessToken: "encrypted-token",
					},
				]);
				getSecretStorageStatusForAccounts.mockReturnValue({ security: "access_required" });

				const { getExternalTrackingSettings } = await import("./external-tracking-settings-service");
				const settings                        = getExternalTrackingSettings();

				expect(decryptAccountSecret).not.toHaveBeenCalled();
				expect(settings.accounts.find(account => account.provider === "anilist")?.tokenExpiresAt).toBeNull();
			},
		);
	},
);
