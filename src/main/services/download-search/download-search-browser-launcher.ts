import { LoggerUtils } from "@nimlat/loggers/main";
import type { DownloadBrowserConfig } from "@nimlat/types/download-search";
import { shell } from "electron";
import { spawn } from "node:child_process";

type BrowserProcess = {
	once(eventName: "error", listener: (error: Error) => void): BrowserProcess;
	once(eventName: "spawn", listener: () => void): BrowserProcess;
	unref(): void;
};

type SpawnBrowserProcess = (
	command: string,
	args: string[],
	options: {
		detached: true;
		stdio: "ignore";
	},
) => BrowserProcess;

type DownloadSearchBrowserLauncherDependencies = {
	openExternal(url: string): Promise<void>;
	spawnProcess: SpawnBrowserProcess;
	platform: NodeJS.Platform;
	logOpenError(scope: string, error: Error): void;
};

const defaultDependencies: DownloadSearchBrowserLauncherDependencies = {
	openExternal: (url) => shell.openExternal(url),
	spawnProcess: (
									command,
		              args,
		              options,
								) => spawn(
		command,
		args,
		options,
	),
	platform:     process.platform,
	logOpenError: (scope, error) => LoggerUtils.logMainServiceError(
		scope,
		error,
	),
};

export function isMacAppBundle(path: string, platform: NodeJS.Platform = process.platform): boolean {
	return platform === "darwin" && path.toLowerCase().endsWith(".app");
}

export class DownloadSearchBrowserLauncher {
	public constructor(private readonly dependencies: DownloadSearchBrowserLauncherDependencies = defaultDependencies) {}

	public async openUrl(config: DownloadBrowserConfig, url: string): Promise<void> {
		try {
			if (!await this.spawnCustomBrowser(
				config,
				url,
			)) {
				await this.dependencies.openExternal(url);
			}
		} catch (customBrowserError) {
			this.dependencies.logOpenError(
				"download-search.open.custom-browser",
				customBrowserError instanceof Error ? customBrowserError : new Error("Custom browser launch failed."),
			);
			await this.dependencies.openExternal(url);
		}
	}

	private spawnCustomBrowser(config: DownloadBrowserConfig, url: string): Promise<boolean> {
		const executablePath = config.executablePath?.trim();
		if (config.mode !== "custom" || !executablePath) {
			return Promise.resolve(false);
		}

		const command = isMacAppBundle(
			executablePath,
			this.dependencies.platform,
		)
			? "open"
			: executablePath;
		const args    = command === "open"
			? [
				"-a",
				executablePath,
				url,
			]
			: [ url ];

		return new Promise((resolve, reject) => {
			const child = this.dependencies.spawnProcess(
				command,
				args,
				{
					detached: true,
					stdio:    "ignore",
				},
			);
			child.once(
				"error",
				reject,
			);
			child.once(
				"spawn",
				() => {
					child.unref();
					resolve(true);
				},
			);
		});
	}
}

export const downloadSearchBrowserLauncher = new DownloadSearchBrowserLauncher();
