// @vitest-environment node
import {
	afterAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => {
	const encryptString = vi.fn((value: string) => Buffer.from(
		`encrypted:${ value }`,
		"utf8",
	));
	const decryptString = vi.fn((value: Buffer) => value.toString("utf8").replace(
		"encrypted:",
		"",
	));
	const getSelectedStorageBackend = vi.fn(() => "gnome_libsecret");
	const isEncryptionAvailable     = vi.fn(() => true);

	return {
		decryptString,
		encryptString,
		getSelectedStorageBackend,
		isEncryptionAvailable,
	};
});

const originalPlatform = process.platform;

vi.mock(
	"electron",
	() => ({
		safeStorage: {
			decryptString:             mocks.decryptString,
			encryptString:             mocks.encryptString,
			getSelectedStorageBackend: mocks.getSelectedStorageBackend,
			isEncryptionAvailable:     mocks.isEncryptionAvailable,
		},
	}),
);

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_USER_DB: "/tmp/nimlat/user_data.db",
	}),
);

function setPlatform(platform: NodeJS.Platform): void {
	Object.defineProperty(
		process,
		"platform",
		{
			configurable: true,
			value:        platform,
		},
	);
}

describe(
	"external tracking secret storage",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			delete process.env.NIMLAT_E2E_FORCE_PLAINTEXT_SECRET_STORAGE;
			mocks.isEncryptionAvailable.mockReturnValue(true);
			mocks.getSelectedStorageBackend.mockReturnValue("gnome_libsecret");
			setPlatform("darwin");
		});

		afterAll(() => {
			setPlatform(originalPlatform);
		});

		it(
			"encrypts and decrypts token strings with an explicit storage marker",
			async () => {
				const {
								decryptExternalTrackingSecret,
								encryptExternalTrackingSecret,
							} = await import("./external-tracking-secret-storage");

				const encrypted = encryptExternalTrackingSecret("mal-token");

				expect(encrypted).toMatch(/^electron-safe-storage:v1:/u);
				expect(encrypted).not.toContain("mal-token");
				expect(decryptExternalTrackingSecret(encrypted)).toBe("mal-token");
				expect(mocks.encryptString).toHaveBeenCalledWith("mal-token");
			},
		);

		it(
			"keeps plaintext values readable when the user accepted plaintext fallback storage",
			async () => {
				const { decryptExternalTrackingSecret } = await import("./external-tracking-secret-storage");

				expect(decryptExternalTrackingSecret("plain-token")).toBe("plain-token");
				expect(mocks.decryptString).not.toHaveBeenCalled();
			},
		);

		it(
			"reports Linux basic_text as plaintext fallback storage",
			async () => {
				setPlatform("linux");
				mocks.getSelectedStorageBackend.mockReturnValue("basic_text");
				const { getExternalTrackingSecretStorageStatus } = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					backend:             "basic_text",
					backendLabel:        "Linux basic_text fallback",
					encryptionAvailable: true,
					security:            "plaintext",
					storagePath:         "/tmp/nimlat/user_data.db",
					message:             expect.stringContaining("plaintext"),
					warning:             expect.stringContaining("/tmp/nimlat/user_data.db"),
				});
			},
		);

		it(
			"exposes the retry after an encrypted credential cannot be read from Keychain",
			async () => {
				mocks.decryptString.mockImplementationOnce(() => {
					throw new Error("User denied Keychain access");
				});
				const {
								decryptExternalTrackingSecret,
								getExternalTrackingSecretStorageStatus,
							} = await import("./external-tracking-secret-storage");

				expect(() => decryptExternalTrackingSecret("electron-safe-storage:v1:ZW5jcnlwdGVk"))
					.toThrow(/Keychain access was not granted/u);
				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					security:       "plaintext",
					retryAvailable: true,
				});
			},
		);

		it(
			"reports Windows Data Protection API as protected storage",
			async () => {
				setPlatform("win32");
				const { getExternalTrackingSecretStorageStatus } = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					backend:             null,
					backendLabel:        "Windows Data Protection API",
					encryptionAvailable: true,
					security:            "os_encrypted",
					storagePath:         null,
					retryAvailable:      false,
					message:             expect.stringContaining("Windows Data Protection API"),
					warning:             null,
				});
				expect(mocks.encryptString).toHaveBeenCalledWith("nimlat-external-tracking-safe-storage-check");
			},
		);

		it(
			"does not report success while an existing Windows token remains plaintext",
			async () => {
				setPlatform("win32");
				const { getExternalTrackingSecretStorageStatusForAccounts } = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatusForAccounts([
					{
						accessToken:         "legacy-plaintext-token",
						refreshToken:        null,
						pendingCodeVerifier: null,
					},
				])).toMatchObject({
					backendLabel:           "Windows Data Protection API",
					plaintextSecretsStored: true,
					security:               "plaintext",
					storagePath:            "/tmp/nimlat/user_data.db",
					retryAvailable:         true,
					message:                expect.stringContaining("plaintext"),
					warning:                expect.stringContaining("Windows Data Protection API"),
				});
			},
		);

		it(
			"keeps the Windows success state when every persisted token is encrypted",
			async () => {
				setPlatform("win32");
				const { getExternalTrackingSecretStorageStatusForAccounts } = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatusForAccounts([
					{
						accessToken:         "electron-safe-storage:v1:ZW5jcnlwdGVk",
						refreshToken:        null,
						pendingCodeVerifier: null,
					},
				])).toMatchObject({
					backendLabel:   "Windows Data Protection API",
					security:       "os_encrypted",
					retryAvailable: false,
				});
			},
		);

		it(
			"stores new secrets as plaintext when OS encryption is unavailable",
			async () => {
				setPlatform("win32");
				mocks.isEncryptionAvailable.mockReturnValue(false);
				const {
								encryptExternalTrackingSecret,
								getExternalTrackingSecretStorageStatus,
							} = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus().security).toBe("plaintext");
				expect(encryptExternalTrackingSecret("token")).toBe("token");
			},
		);

		it(
			"refuses to save new plaintext credentials when macOS Keychain is unavailable",
			async () => {
				mocks.isEncryptionAvailable.mockReturnValue(false);
				const {
								encryptExternalTrackingSecret,
								getExternalTrackingSecretStorageStatus,
							} = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					security:       "plaintext",
					retryAvailable: true,
					message:        expect.stringContaining("will not save"),
				});
				expect(() => encryptExternalTrackingSecret("token")).toThrow(/will not save/u);
			},
		);

		it(
			"forces plaintext storage for deterministic Electron E2E runs",
			async () => {
				process.env.NIMLAT_E2E_FORCE_PLAINTEXT_SECRET_STORAGE = "1";
				const {
								encryptExternalTrackingSecret,
								getExternalTrackingSecretStorageStatus,
							}                                               = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					backend:             "e2e_plaintext",
					backendLabel:        "E2E plaintext secret storage",
					encryptionAvailable: false,
					security:            "plaintext",
					storagePath:         "/tmp/nimlat/user_data.db",
				});
				expect(encryptExternalTrackingSecret("token")).toBe("token");
				expect(mocks.encryptString).not.toHaveBeenCalled();
			},
		);

		it(
			"does not prompt during a passive macOS storage status read",
			async () => {
				const { getExternalTrackingSecretStorageStatus } = await import("./external-tracking-secret-storage");

				expect(getExternalTrackingSecretStorageStatus()).toMatchObject({
					backendLabel:   "macOS Keychain",
					security:       "access_required",
					message:        expect.stringContaining("macOS Keychain"),
					retryAvailable: true,
					warning:        null,
				});
				expect(mocks.encryptString).not.toHaveBeenCalled();
			},
		);

		it(
			"reports macOS Keychain as safe after an explicit access request",
			async () => {
				const { requestExternalTrackingSecretStorageAccess } = await import("./external-tracking-secret-storage");

				expect(requestExternalTrackingSecretStorageAccess()).toMatchObject({
					backendLabel:   "macOS Keychain",
					security:       "os_encrypted",
					retryAvailable: false,
				});
				expect(mocks.encryptString).toHaveBeenCalledWith("nimlat-external-tracking-safe-storage-check");
			},
		);

		it(
			"keeps retry available and refuses new plaintext after Keychain access is denied",
			async () => {
				mocks.encryptString.mockImplementationOnce(() => {
					throw new Error("User denied Keychain access");
				});
				const {
								encryptExternalTrackingSecret,
								requestExternalTrackingSecretStorageAccess,
							} = await import("./external-tracking-secret-storage");

				expect(requestExternalTrackingSecretStorageAccess()).toMatchObject({
					security:       "plaintext",
					retryAvailable: true,
					message:        expect.stringContaining("not granted"),
				});
				expect(() => encryptExternalTrackingSecret("new-token")).toThrow(/Keychain access was not granted/u);
			},
		);
	},
);
