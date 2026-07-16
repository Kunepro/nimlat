import { rmSync } from "node:fs";
import { join } from "node:path";
import {
	_electron as electron,
	type ElectronApplication,
	type Page,
} from "playwright";
import {
	electronExecutablePath,
	type MainHostSnapshot,
	runMainCommand,
	waitForMainReady,
	watchRendererConsole,
} from "./playwright-electron-helpers";

export interface NimlatElectronSession {
	basePage: Page;
	electronApp: ElectronApplication;
	snapshot: MainHostSnapshot;
	cleanup: () => Promise<void>;
	restart: () => Promise<void>;
}

interface LaunchElectronProcessOptions {
	bootMode: "fresh" | "reuse";
	tempRoot?: string;
}

async function launchElectronProcess(options: LaunchElectronProcessOptions): Promise<{
	basePage: Page;
	electronApp: ElectronApplication;
	snapshot: MainHostSnapshot;
}> {
	const electronApp = await electron.launch({
		executablePath: electronExecutablePath,
		args:           [
			join(
				process.cwd(),
				"tools",
				"e2e",
				"playwright-electron-entry.cjs",
			),
		],
		env:            {
			...process.env,
			NIMLAT_E2E_BOOT_MODE:                      options.bootMode,
			NIMLAT_E2E_FORCE_PLAINTEXT_SECRET_STORAGE: "1",
			...(options.tempRoot ? { NIMLAT_E2E_TEMP_ROOT: options.tempRoot } : {}),
			TSX_DISABLE_CACHE: "1",
		},
	});
	const snapshot    = await waitForMainReady(electronApp);
	const basePage    = await electronApp.firstWindow();
	watchRendererConsole(basePage);

	return {
		basePage,
		electronApp,
		snapshot,
	};
}

export async function launchNimlatElectronSession(): Promise<NimlatElectronSession> {
	let current = await launchElectronProcess({ bootMode: "fresh" });

	let hasCleanedUp      = false;
	const closeCurrentApp = async () => {
		await runMainCommand(
			current.electronApp,
			"destroyAllSecondaryWindows",
		).catch(() => undefined);
		await runMainCommand(
			current.electronApp,
			"closeDatabaseAndProviders",
		).catch(() => undefined);
		await current.electronApp.close().catch(() => undefined);
	};

	const cleanup = async () => {
		if (hasCleanedUp) {
			return;
		}
		hasCleanedUp = true;

		await closeCurrentApp();
		rmSync(
			current.snapshot.tempRoot,
			{
				recursive: true,
				force:     true,
			},
		);
	};

	return {
		get basePage() {
			return current.basePage;
		},
		cleanup,
		get electronApp() {
			return current.electronApp;
		},
		restart: async () => {
			if (hasCleanedUp) {
				throw new Error("Cannot restart an E2E session after cleanup.");
			}
			const tempRoot = current.snapshot.tempRoot;
			await closeCurrentApp();
			current = await launchElectronProcess({
				bootMode: "reuse",
				tempRoot,
			});
		},
		get snapshot() {
			return current.snapshot;
		},
	};
}
