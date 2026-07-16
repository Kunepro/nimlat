import type {
	BackgroundStyle,
	LibraryDisplayFilters,
	PreferredTitleLanguage,
} from "./user-config";

// User config APIs are local preference reads/writes plus narrow change events.
// Business workflows should consume services/facades instead of adding logic here.
export interface UserConfigElectronApi {
	getAnimeDbVersion(): Promise<string | null | undefined>;

	setAnimeDbVersion(version: string): Promise<void>;

	getAdultContentStatus(): Promise<boolean>;

	setAdultContentStatus(enabled: boolean): Promise<void>;

	onAdultContentStatusChanged(callback: (enabled: boolean) => void): () => void;

	getBackgroundStyle(): Promise<BackgroundStyle>;

	setBackgroundStyle(style: BackgroundStyle): Promise<void>;

	onBackgroundStyleChanged(callback: (style: BackgroundStyle) => void): () => void;

	getDevModeStatus(): Promise<boolean>;

	getAdminModeStatus(): Promise<boolean>;

	getPreferredTitleLanguage(): Promise<PreferredTitleLanguage>;

	setPreferredTitleLanguage(language: PreferredTitleLanguage): Promise<void>;

	onPreferredTitleLanguageChanged(callback: (language: PreferredTitleLanguage) => void): () => void;

	getCanvasDiagnosticsStatus(): Promise<boolean>;

	setCanvasDiagnosticsStatus(enabled: boolean): Promise<void>;

	onCanvasDiagnosticsStatusChanged(callback: (enabled: boolean) => void): () => void;

	getLibraryDisplayFilters(): Promise<LibraryDisplayFilters>;

	setLibraryDisplayFilters(filters: LibraryDisplayFilters): Promise<void>;

	getLastRoute(): Promise<string | null>;

	setLastRoute(route: string): Promise<void>;
}
