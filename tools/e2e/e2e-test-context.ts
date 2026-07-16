import type {
	ElectronApplication,
	Page,
} from "playwright";
import type { MainHostSnapshot } from "./playwright-electron-helpers";

export interface NimlatE2ETestContext {
	getBasePage: () => Page;
	getElectronApp: () => ElectronApplication;
	getSnapshot: () => MainHostSnapshot;
	restartSession: () => Promise<void>;
	setSnapshot: (snapshot: MainHostSnapshot) => void;
}
