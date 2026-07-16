import {
	BUS_ConfigAdultContentChanged,
	BUS_ConfigBackgroundStyleChanged,
	BUS_ConfigCanvasDiagnosticsChanged,
	BUS_ConfigPreferredTitleLanguageChanged,
} from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import type {
	BackgroundStyle,
	LibraryDisplayFilters,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";

export class ConfigService {
	public static getAnimeDbVersion(): string | null {
		return UserDbFacade.config.getAnimeDbVersion() ?? null;
	}

	public static setAnimeDbVersion(version: string): void {
		UserDbFacade.config.setAnimeDbVersion(version);
	}

	public static isAdultContentEnabled(): boolean {
		return UserDbFacade.config.isAdultContentEnabled();
	}

	public static setAdultContentEnabled(enabled: boolean): void {
		UserDbFacade.config.setAdultContentEnabled(enabled);
		BUS_ConfigAdultContentChanged.next(enabled);
	}

	public static getBackgroundStyle(): BackgroundStyle {
		return UserDbFacade.config.getBackgroundStyle();
	}

	public static setBackgroundStyle(style: BackgroundStyle): void {
		UserDbFacade.config.setBackgroundStyle(style);
		BUS_ConfigBackgroundStyleChanged.next(style);
	}

	public static isDevModeEnabled(): boolean {
		return UserDbFacade.config.isDevModeEnabled();
	}

	public static isAdminModeEnabled(): boolean {
		return UserDbFacade.config.isAdminModeEnabled();
	}

	public static getPreferredTitleLanguage(): PreferredTitleLanguage {
		return UserDbFacade.config.getPreferredTitleLanguage();
	}

	public static setPreferredTitleLanguage(language: PreferredTitleLanguage): void {
		UserDbFacade.config.setPreferredTitleLanguage(language);
		BUS_ConfigPreferredTitleLanguageChanged.next(language);
	}

	public static isCanvasDiagnosticsEnabled(): boolean {
		return UserDbFacade.config.isCanvasDiagnosticsEnabled();
	}

	public static setCanvasDiagnosticsEnabled(enabled: boolean): void {
		UserDbFacade.config.setCanvasDiagnosticsEnabled(enabled);
		BUS_ConfigCanvasDiagnosticsChanged.next(enabled);
	}

	public static getLibraryDisplayFilters(): LibraryDisplayFilters {
		return UserDbFacade.config.getLibraryDisplayFilters();
	}

	public static setLibraryDisplayFilters(filters: LibraryDisplayFilters): void {
		UserDbFacade.config.setLibraryDisplayFilters(filters);
	}

	public static getLastRoute(): string | null {
		return UserDbFacade.config.getLastRoute();
	}

	public static setLastRoute(route: string): void {
		UserDbFacade.config.setLastRoute(route);
	}
}
