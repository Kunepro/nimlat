// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchBrowserPicker } from "./download-search-browser-picker";

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: vi.fn(),
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		BrowserWindow: {
			getFocusedWindow: vi.fn(),
			getAllWindows:    vi.fn(),
		},
		dialog:        {
			showOpenDialog: vi.fn(),
		},
	}),
);

describe(
	"DownloadSearchBrowserPicker",
	() => {
		it(
			"returns the selected executable path",
			async () => {
				const focusedWindow  = {};
				const showOpenDialog = vi.fn().mockResolvedValue({
					canceled:  false,
					filePaths: [ "/usr/bin/firefox" ],
				});
				const picker         = new DownloadSearchBrowserPicker({
					getFocusedWindow: () => focusedWindow as never,
					getAllWindows:    () => [],
					showOpenDialog,
					platform:         "linux",
					logPickError:     vi.fn(),
				});

				await expect(picker.pickExecutable()).resolves.toEqual({
					success:        true,
					executablePath: "/usr/bin/firefox",
				});
				expect(showOpenDialog).toHaveBeenCalledWith(
					focusedWindow,
					expect.objectContaining({
						properties: [ "openFile" ],
					}),
				);
			},
		);

		it(
			"allows app bundle directories on macOS",
			async () => {
				const showOpenDialog = vi.fn().mockResolvedValue({
					canceled:  true,
					filePaths: [],
				});
				const picker         = new DownloadSearchBrowserPicker({
					getFocusedWindow: () => null,
					getAllWindows:    () => [],
					showOpenDialog,
					platform:         "darwin",
					logPickError:     vi.fn(),
				});

				await picker.pickExecutable();

				expect(showOpenDialog).toHaveBeenCalledWith(
					undefined,
					expect.objectContaining({
						properties: [
							"openFile",
							"openDirectory",
						],
					}),
				);
			},
		);

		it(
			"reports cancellation without logging an error",
			async () => {
				const logPickError = vi.fn();
				const picker       = new DownloadSearchBrowserPicker({
					getFocusedWindow: () => null,
					getAllWindows:    () => [],
					showOpenDialog:   vi.fn().mockResolvedValue({
						canceled:  true,
						filePaths: [],
					}),
					platform:         "linux",
					logPickError,
				});

				await expect(picker.pickExecutable()).resolves.toEqual({
					success:  false,
					canceled: true,
				});
				expect(logPickError).not.toHaveBeenCalled();
			},
		);

		it(
			"logs dialog failures and returns a stable error result",
			async () => {
				const expectedError = new Error("dialog failed");
				const logPickError  = vi.fn();
				const picker        = new DownloadSearchBrowserPicker({
					getFocusedWindow: () => null,
					getAllWindows:    () => [],
					showOpenDialog:   vi.fn().mockRejectedValue(expectedError),
					platform:         "linux",
					logPickError,
				});

				await expect(picker.pickExecutable()).resolves.toEqual({
					success: false,
					error:   "dialog failed",
				});
				expect(logPickError).toHaveBeenCalledWith(
					"download-search.pick-browser-executable",
					expectedError,
				);
			},
		);
	},
);
