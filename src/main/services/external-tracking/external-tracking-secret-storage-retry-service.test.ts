// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	encryptSecret:        vi.fn(),
	listAccountSecrets:   vi.fn(),
	requestAccess:        vi.fn(),
	resetVerification:    vi.fn(),
	updateAccountSecrets: vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: {
				listAccountSecrets:   mocks.listAccountSecrets,
				updateAccountSecrets: mocks.updateAccountSecrets,
			},
		},
	}),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		encryptExternalTrackingSecret:                        mocks.encryptSecret,
		requestExternalTrackingSecretStorageAccess:           mocks.requestAccess,
		resetExternalTrackingSecretStorageAccessVerification: mocks.resetVerification,
	}),
);

describe(
	"external tracking secret storage retry service",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			mocks.requestAccess.mockReturnValue({ security: "os_encrypted" });
			mocks.listAccountSecrets.mockReturnValue([
				{
					provider:            "anilist",
					accessToken:         "plain-access",
					refreshToken:        null,
					pendingCodeVerifier: null,
				},
				{
					provider:            "mal",
					accessToken:         "protected:access",
					refreshToken:        null,
					pendingCodeVerifier: null,
				},
			]);
			mocks.encryptSecret.mockImplementation((value: string | null) => {
				if (!value || value.startsWith("protected:")) {
					return value;
				}

				return `protected:${ value }`;
			});
		});

		it(
			"atomically persists only account rows whose secrets needed protection",
			async () => {
				const { retryExternalTrackingSecretStorage } = await import("./external-tracking-secret-storage-retry-service");

				expect(retryExternalTrackingSecretStorage()).toEqual({ security: "os_encrypted" });
				expect(mocks.updateAccountSecrets).toHaveBeenCalledWith([
					{
						provider:            "anilist",
						accessToken:         "protected:plain-access",
						refreshToken:        null,
						pendingCodeVerifier: null,
					},
				]);
			},
		);

		it(
			"does not inspect account secrets when access is denied again",
			async () => {
				mocks.requestAccess.mockReturnValue({ security: "plaintext" });
				const { retryExternalTrackingSecretStorage } = await import("./external-tracking-secret-storage-retry-service");

				expect(retryExternalTrackingSecretStorage()).toEqual({ security: "plaintext" });
				expect(mocks.listAccountSecrets).not.toHaveBeenCalled();
				expect(mocks.updateAccountSecrets).not.toHaveBeenCalled();
			},
		);

		it(
			"restores the explicit retry state when the atomic DB update fails",
			async () => {
				mocks.updateAccountSecrets.mockImplementationOnce(() => {
					throw new Error("DB write failed");
				});
				const { retryExternalTrackingSecretStorage } = await import("./external-tracking-secret-storage-retry-service");

				expect(() => retryExternalTrackingSecretStorage()).toThrow("DB write failed");
				expect(mocks.resetVerification).toHaveBeenCalledTimes(1);
			},
		);
	},
);
