// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installUserConfigApiMock() {
	let adultContentListener: ((enabled: boolean) => void) | null                                                     = null;
	let backgroundStyleListener: ((style: "synthwave" | "kanaMatrix" | "kanaGrid" | "staticDarkBlue") => void) | null = null;
	let canvasDiagnosticsListener: ((enabled: boolean) => void) | null                                                = null;
	let preferredTitleLanguageListener: ((language: "english" | "romaji" | "native") => void) | null                  = null;
	const unsubscribeAdultContent                                                                                     = vi.fn();
	const unsubscribeBackgroundStyle                                                                                  = vi.fn();
	const unsubscribeCanvasDiagnostics                                                                                = vi.fn();
	const unsubscribePreferredTitleLanguage                                                                           = vi.fn();
	const userConfig                                                                                                  = {
		getDevModeStatus:                 vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
		getAdminModeStatus:               vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		getCanvasDiagnosticsStatus:       vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		setCanvasDiagnosticsStatus:       vi.fn<(enabled: boolean) => Promise<void>>().mockResolvedValue(undefined),
		onAdultContentStatusChanged:      vi.fn((listener: (enabled: boolean) => void) => {
			adultContentListener = listener;
			return unsubscribeAdultContent;
		}),
		onBackgroundStyleChanged:         vi.fn((listener: (style: "synthwave" | "kanaMatrix" | "kanaGrid" | "staticDarkBlue") => void) => {
			backgroundStyleListener = listener;
			return unsubscribeBackgroundStyle;
		}),
		onPreferredTitleLanguageChanged:  vi.fn((listener: (language: "english" | "romaji" | "native") => void) => {
			preferredTitleLanguageListener = listener;
			return unsubscribePreferredTitleLanguage;
		}),
		onCanvasDiagnosticsStatusChanged: vi.fn((listener: (enabled: boolean) => void) => {
			canvasDiagnosticsListener = listener;
			return unsubscribeCanvasDiagnostics;
		}),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				userConfig,
			},
		},
	);

	return {
		userConfig,
		unsubscribeAdultContent,
		unsubscribeBackgroundStyle,
		unsubscribeCanvasDiagnostics,
		unsubscribePreferredTitleLanguage,
		emitAdultContentChanged:           (enabled: boolean) => {
			adultContentListener?.(enabled);
		},
		emitBackgroundStyleChanged:        (style: "synthwave" | "kanaMatrix" | "kanaGrid" | "staticDarkBlue") => {
			backgroundStyleListener?.(style);
		},
		emitCanvasDiagnosticsChanged:      (enabled: boolean) => {
			canvasDiagnosticsListener?.(enabled);
		},
		emitPreferredTitleLanguageChanged: (language: "english" | "romaji" | "native") => {
			preferredTitleLanguageListener?.(language);
		},
	};
}

describe(
	"UserConfigStatusService",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"caches read-only dev and admin status requests",
			async () => {
				const { userConfig }              = installUserConfigApiMock();
				const { UserConfigStatusService } = await import("./user-config-status-service");

				const firstDevModeRead    = UserConfigStatusService.getDevModeStatus();
				const secondDevModeRead   = UserConfigStatusService.getDevModeStatus();
				const firstAdminModeRead  = UserConfigStatusService.getAdminModeStatus();
				const secondAdminModeRead = UserConfigStatusService.getAdminModeStatus();

				await expect(firstDevModeRead).resolves.toBe(true);
				await expect(secondDevModeRead).resolves.toBe(true);
				await expect(firstAdminModeRead).resolves.toBe(false);
				await expect(secondAdminModeRead).resolves.toBe(false);
				expect(secondDevModeRead).toBe(firstDevModeRead);
				expect(secondAdminModeRead).toBe(firstAdminModeRead);
				expect(userConfig.getDevModeStatus).toHaveBeenCalledTimes(1);
				expect(userConfig.getAdminModeStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"fans out one canvas diagnostics subscription and releases it after the last listener",
			async () => {
				const {
								emitCanvasDiagnosticsChanged,
								unsubscribeCanvasDiagnostics,
								userConfig,
							}                           = installUserConfigApiMock();
				const { UserConfigStatusService } = await import("./user-config-status-service");
				const firstListener               = vi.fn();
				const secondListener              = vi.fn();

				const firstSubscription  = UserConfigStatusService.canvasDiagnosticsStatusChanges().subscribe(firstListener);
				const secondSubscription = UserConfigStatusService.canvasDiagnosticsStatusChanges().subscribe(secondListener);

				expect(userConfig.onCanvasDiagnosticsStatusChanged).toHaveBeenCalledTimes(1);
				emitCanvasDiagnosticsChanged(true);
				expect(firstListener).toHaveBeenCalledWith(true);
				expect(secondListener).toHaveBeenCalledWith(true);

				firstSubscription.unsubscribe();
				emitCanvasDiagnosticsChanged(false);
				expect(firstListener).toHaveBeenCalledTimes(1);
				expect(secondListener).toHaveBeenLastCalledWith(false);
				expect(unsubscribeCanvasDiagnostics).not.toHaveBeenCalled();

				secondSubscription.unsubscribe();
				expect(unsubscribeCanvasDiagnostics).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes shared streams for user config change events",
			async () => {
				const {
								emitAdultContentChanged,
								emitBackgroundStyleChanged,
								emitPreferredTitleLanguageChanged,
								unsubscribeAdultContent,
								unsubscribeBackgroundStyle,
								unsubscribePreferredTitleLanguage,
								userConfig,
							}                           = installUserConfigApiMock();
				const { UserConfigStatusService } = await import("./user-config-status-service");
				const adultListener               = vi.fn();
				const backgroundListener          = vi.fn();
				const titleLanguageListener       = vi.fn();

				const adultSubscription         = UserConfigStatusService.adultContentStatusChanges().subscribe(adultListener);
				const backgroundSubscription    = UserConfigStatusService.backgroundStyleChanges().subscribe(backgroundListener);
				const titleLanguageSubscription = UserConfigStatusService.preferredTitleLanguageChanges().subscribe(titleLanguageListener);

				expect(userConfig.onAdultContentStatusChanged).toHaveBeenCalledTimes(1);
				expect(userConfig.onBackgroundStyleChanged).toHaveBeenCalledTimes(1);
				expect(userConfig.onPreferredTitleLanguageChanged).toHaveBeenCalledTimes(1);

				emitAdultContentChanged(true);
				emitBackgroundStyleChanged("kanaGrid");
				emitPreferredTitleLanguageChanged("native");

				expect(adultListener).toHaveBeenCalledWith(true);
				expect(backgroundListener).toHaveBeenCalledWith("kanaGrid");
				expect(titleLanguageListener).toHaveBeenCalledWith("native");

				adultSubscription.unsubscribe();
				backgroundSubscription.unsubscribe();
				titleLanguageSubscription.unsubscribe();

				expect(unsubscribeAdultContent).toHaveBeenCalledTimes(1);
				expect(unsubscribeBackgroundStyle).toHaveBeenCalledTimes(1);
				expect(unsubscribePreferredTitleLanguage).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"updates the canvas diagnostics cache after a successful local write",
			async () => {
				const { userConfig }              = installUserConfigApiMock();
				const { UserConfigStatusService } = await import("./user-config-status-service");
				const listener                    = vi.fn();

				await expect(UserConfigStatusService.getCanvasDiagnosticsStatus()).resolves.toBe(false);
				const subscription = UserConfigStatusService.canvasDiagnosticsStatusChanges().subscribe(listener);
				await UserConfigStatusService.setCanvasDiagnosticsStatus(true);
				await expect(UserConfigStatusService.getCanvasDiagnosticsStatus()).resolves.toBe(true);

				expect(userConfig.getCanvasDiagnosticsStatus).toHaveBeenCalledTimes(1);
				expect(userConfig.setCanvasDiagnosticsStatus).toHaveBeenCalledWith(true);
				expect(listener).toHaveBeenCalledWith(true);
				subscription.unsubscribe();
			},
		);

		it(
			"does not emit duplicate canvas diagnostics values",
			async () => {
				installUserConfigApiMock();
				const { UserConfigStatusService } = await import("./user-config-status-service");
				const listener                    = vi.fn();

				const subscription = UserConfigStatusService.canvasDiagnosticsStatusChanges().subscribe(listener);
				await UserConfigStatusService.setCanvasDiagnosticsStatus(true);
				await UserConfigStatusService.setCanvasDiagnosticsStatus(true);

				expect(listener).toHaveBeenCalledTimes(1);
				expect(listener).toHaveBeenCalledWith(true);
				subscription.unsubscribe();
			},
		);
	},
);
