// @vitest-environment jsdom

import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { UserConfigFacade } from "../../facades";
import {
	loadAdultContentPreference,
	loadBackgroundStylePreference,
	loadCanvasDiagnosticsPreference,
	loadDevModePreference,
	loadPreferredTitleLanguagePreference,
	saveAdultContentPreference,
	saveBackgroundStylePreference,
	saveCanvasDiagnosticsPreference,
	savePreferredTitleLanguagePreference,
} from "./preferences-general-settings-runner";

describe(
	"preferences-general-settings-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads general preference values through the user-config facade",
			async () => {
				vi.spyOn(
					UserConfigFacade,
					"getAdultContentStatus",
				).mockResolvedValue(true);
				vi.spyOn(
					UserConfigFacade,
					"getBackgroundStyle",
				).mockResolvedValue("synthwave");
				vi.spyOn(
					UserConfigFacade,
					"getPreferredTitleLanguage",
				).mockResolvedValue("romaji");
				vi.spyOn(
					UserConfigFacade,
					"getDevModeStatus",
				).mockResolvedValue(false);
				vi.spyOn(
					UserConfigFacade,
					"getCanvasDiagnosticsStatus",
				).mockResolvedValue(true);

				await expect(loadAdultContentPreference()).resolves.toBe(true);
				await expect(loadBackgroundStylePreference()).resolves.toBe("synthwave");
				await expect(loadPreferredTitleLanguagePreference()).resolves.toBe("romaji");
				await expect(loadDevModePreference()).resolves.toBe(false);
				await expect(loadCanvasDiagnosticsPreference()).resolves.toBe(true);

				expect(UserConfigFacade.getAdultContentStatus).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getBackgroundStyle).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getPreferredTitleLanguage).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getDevModeStatus).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getCanvasDiagnosticsStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"saves general preference values through the user-config facade",
			async () => {
				vi.spyOn(
					UserConfigFacade,
					"setAdultContentStatus",
				).mockResolvedValue();
				vi.spyOn(
					UserConfigFacade,
					"setBackgroundStyle",
				).mockResolvedValue();
				vi.spyOn(
					UserConfigFacade,
					"setPreferredTitleLanguage",
				).mockResolvedValue();
				vi.spyOn(
					UserConfigFacade,
					"setCanvasDiagnosticsStatus",
				).mockResolvedValue();

				await expect(saveAdultContentPreference(true)).resolves.toBeUndefined();
				await expect(saveBackgroundStylePreference("kanaGrid")).resolves.toBeUndefined();
				await expect(savePreferredTitleLanguagePreference("native")).resolves.toBeUndefined();
				await expect(saveCanvasDiagnosticsPreference(false)).resolves.toBeUndefined();

				expect(UserConfigFacade.setAdultContentStatus).toHaveBeenCalledWith(true);
				expect(UserConfigFacade.setBackgroundStyle).toHaveBeenCalledWith("kanaGrid");
				expect(UserConfigFacade.setPreferredTitleLanguage).toHaveBeenCalledWith("native");
				expect(UserConfigFacade.setCanvasDiagnosticsStatus).toHaveBeenCalledWith(false);
			},
		);
	},
);
