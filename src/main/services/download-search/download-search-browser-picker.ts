import { LoggerUtils } from "@nimlat/loggers/main";
import type { PickDownloadBrowserExecutableResult } from "@nimlat/types/download-search";
import {
	BrowserWindow,
	dialog,
	type OpenDialogOptions,
	type OpenDialogReturnValue,
} from "electron";

type DialogParentWindow = BrowserWindow | null | undefined;

type DownloadSearchBrowserPickerDependencies = {
	getFocusedWindow(): BrowserWindow | null;
	getAllWindows(): BrowserWindow[];
	showOpenDialog(window: DialogParentWindow, options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
	platform: NodeJS.Platform;
	logPickError(scope: string, error: Error): void;
};

const defaultDependencies: DownloadSearchBrowserPickerDependencies = {
	getFocusedWindow: () => BrowserWindow.getFocusedWindow(),
	getAllWindows:    () => BrowserWindow.getAllWindows(),
	showOpenDialog:   (window, options) => window
		? dialog.showOpenDialog(
			window,
			options,
		)
		: dialog.showOpenDialog(options),
	platform:         process.platform,
	logPickError:     (scope, error) => LoggerUtils.logMainServiceError(
		scope,
		error,
	),
};

export class DownloadSearchBrowserPicker {
	public constructor(private readonly dependencies: DownloadSearchBrowserPickerDependencies = defaultDependencies) {}

	public async pickExecutable(): Promise<PickDownloadBrowserExecutableResult> {
		try {
			const window = this.dependencies.getFocusedWindow() || this.dependencies.getAllWindows()[ 0 ];
			const result = await this.dependencies.showOpenDialog(
				window,
				{
					title:      "Choose Download default browser",
					properties: this.dependencies.platform === "darwin"
												? [
							"openFile",
							"openDirectory",
						]
												: [ "openFile" ],
				},
			);

			if (result.canceled || result.filePaths.length === 0) {
				return {
					success:  false,
					canceled: true,
				};
			}

			return {
				success:        true,
				executablePath: result.filePaths[ 0 ],
			};
		} catch (error) {
			this.dependencies.logPickError(
				"download-search.pick-browser-executable",
				error instanceof Error ? error : new Error("Failed to pick browser executable."),
			);
			return {
				success: false,
				error:   error instanceof Error ? error.message : "Failed to pick browser executable.",
			};
		}
	}
}

export const downloadSearchBrowserPicker = new DownloadSearchBrowserPicker();
