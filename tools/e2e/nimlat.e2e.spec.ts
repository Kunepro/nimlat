import { test } from "@playwright/test";
import type {
	ElectronApplication,
	Page,
} from "playwright";
import type { NimlatE2ETestContext } from "./e2e-test-context";
import {
	assertNoMainProcessDiagnostics,
	assertNoRendererDiagnostics,
	type MainHostSnapshot,
} from "./playwright-electron-helpers";
import {
	launchNimlatElectronSession,
	type NimlatElectronSession,
} from "./playwright-electron-session";
import { registerCorePreferenceTests } from "./specs/core-preferences.e2e";
import { registerMediaLifecycleTests } from "./specs/media-lifecycle.e2e";
import { registerMountedContentTests } from "./specs/mounted-content.e2e";
import { registerReleaseGroupingTests } from "./specs/release-grouping.e2e";
import { registerTerminalHarnessTests } from "./specs/terminal-harnesses.e2e";
import { registerV1IntegrationTests } from "./specs/v1-integrations.e2e";

test.describe.configure({ mode: "serial" });

test.describe(
	"nimlat Electron E2E via Playwright",
	() => {
		let session: NimlatElectronSession;
		let electronApp: ElectronApplication;
		let basePage: Page;
		let snapshot: MainHostSnapshot;
		const context: NimlatE2ETestContext = {
			getBasePage:    () => basePage,
			getElectronApp: () => electronApp,
			getSnapshot:    () => snapshot,
			restartSession: async () => {
				await session.restart();
				electronApp = session.electronApp;
				basePage    = session.basePage;
				snapshot    = session.snapshot;
			},
			setSnapshot:    (nextSnapshot) => {
				snapshot = nextSnapshot;
			},
		};

		test.beforeAll(async () => {
			session     = await launchNimlatElectronSession();
			electronApp = session.electronApp;
			basePage    = session.basePage;
			snapshot    = session.snapshot;
		});

		test.afterEach(async () => {
			const errors: string[] = [];
			try {
				assertNoRendererDiagnostics();
			} catch (error) {
				errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
			}
			try {
				await assertNoMainProcessDiagnostics(electronApp);
			} catch (error) {
				errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
			}
			if (errors.length > 0) {
				throw new Error(errors.join("\n\n"));
			}
		});

		test.afterAll(async () => {
			await session?.cleanup();
		});

		registerCorePreferenceTests(context);
		registerMediaLifecycleTests(context);
		registerReleaseGroupingTests(context);
		registerMountedContentTests(context);
		registerTerminalHarnessTests(context);
		registerV1IntegrationTests(context);
	},
);
