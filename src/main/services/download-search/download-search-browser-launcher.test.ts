// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	DownloadSearchBrowserLauncher,
	isMacAppBundle,
} from "./download-search-browser-launcher";

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
		shell: {
			openExternal: vi.fn(),
		},
	}),
);

function createSpawnProcess(eventName: "spawn" | "error", error: Error = new Error("spawn failed")) {
	const unref   = vi.fn();
	const process = {
		once: vi.fn((registeredEvent: "spawn" | "error", listener: (value?: Error) => void) => {
			if (registeredEvent === eventName) {
				queueMicrotask(() => {
					if (eventName === "error") {
						listener(error);
						return;
					}
					listener();
				});
			}
			return process;
		}),
		unref,
	};
	return process;
}

describe(
	"DownloadSearchBrowserLauncher",
	() => {
		it(
			"detects macOS application bundles only on Darwin",
			() => {
				expect(isMacAppBundle(
					"/Applications/Firefox.app",
					"darwin",
				)).toBe(true);
				expect(isMacAppBundle(
					"/Applications/Firefox.app",
					"linux",
				)).toBe(false);
			},
		);

		it(
			"opens the system browser when custom mode is not configured",
			async () => {
				const openExternal = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const spawnProcess = vi.fn();
				const launcher     = new DownloadSearchBrowserLauncher({
					openExternal,
					spawnProcess,
					platform:     "linux",
					logOpenError: vi.fn(),
				});

				await launcher.openUrl(
					{ mode: "system" },
					"https://example.test/search?q=anime",
				);

				expect(openExternal).toHaveBeenCalledWith("https://example.test/search?q=anime");
				expect(spawnProcess).not.toHaveBeenCalled();
			},
		);

		it(
			"spawns a configured executable without opening the system browser",
			async () => {
				const child        = createSpawnProcess("spawn");
				const openExternal = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const spawnProcess = vi.fn().mockReturnValue(child);
				const launcher     = new DownloadSearchBrowserLauncher({
					openExternal,
					spawnProcess,
					platform:     "linux",
					logOpenError: vi.fn(),
				});

				await launcher.openUrl(
					{
						mode:           "custom",
						executablePath: "/usr/bin/firefox",
					},
					"https://example.test/search?q=anime",
				);

				expect(spawnProcess).toHaveBeenCalledWith(
					"/usr/bin/firefox",
					[ "https://example.test/search?q=anime" ],
					{
						detached: true,
						stdio:    "ignore",
					},
				);
				expect(child.unref).toHaveBeenCalledTimes(1);
				expect(openExternal).not.toHaveBeenCalled();
			},
		);

		it(
			"uses the macOS open command for app bundles",
			async () => {
				const child        = createSpawnProcess("spawn");
				const spawnProcess = vi.fn().mockReturnValue(child);
				const launcher     = new DownloadSearchBrowserLauncher({
					openExternal: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
					spawnProcess,
					platform:     "darwin",
					logOpenError: vi.fn(),
				});

				await launcher.openUrl(
					{
						mode:           "custom",
						executablePath: "/Applications/Firefox.app",
					},
					"https://example.test/search?q=anime",
				);

				expect(spawnProcess).toHaveBeenCalledWith(
					"open",
					[
						"-a",
						"/Applications/Firefox.app",
						"https://example.test/search?q=anime",
					],
					expect.any(Object),
				);
			},
		);

		it(
			"logs custom browser failures and falls back to the system browser",
			async () => {
				const expectedError = new Error("missing executable");
				const openExternal  = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const logOpenError  = vi.fn();
				const launcher      = new DownloadSearchBrowserLauncher({
					openExternal,
					spawnProcess: vi.fn().mockReturnValue(createSpawnProcess(
						"error",
						expectedError,
					)),
					platform:     "linux",
					logOpenError,
				});

				await launcher.openUrl(
					{
						mode:           "custom",
						executablePath: "/missing/firefox",
					},
					"https://example.test/search?q=anime",
				);

				expect(logOpenError).toHaveBeenCalledWith(
					"download-search.open.custom-browser",
					expectedError,
				);
				expect(openExternal).toHaveBeenCalledWith("https://example.test/search?q=anime");
			},
		);
	},
);
