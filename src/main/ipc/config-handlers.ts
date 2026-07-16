/*
 * IPC LAYER (KEEP LEAN)
 * --------------------
 * This file only wires IPC channels to services.
 * No business logic here. If logic grows, move it to src/main/services.
 */
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	BackgroundStyle,
	LibraryDisplayFilters,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import { ipcMain } from "electron";
import { ConfigService } from "../services/config/config-service";

// Config handlers stay transport-thin; persistence and BUS publication live in ConfigService.
export function registerConfigHandlers(): void {
	// Retrieves Anime DB version
	ipcMain.handle(
		IpcChannels.ConfigGetAnimeDbVersion,
		() => ConfigService.getAnimeDbVersion(),
	);

	// Sets Anime DB version
	ipcMain.handle(
		IpcChannels.ConfigSetAnimeDbVersion,
		(_evt, version: string) => ConfigService.setAnimeDbVersion(version),
	);

	// Retrieves Adult Content visibility
	ipcMain.handle(
		IpcChannels.ConfigGetAdultContentStatus,
		() => ConfigService.isAdultContentEnabled(),
	);

	// Sets Adult Content visibility
	ipcMain.handle(
		IpcChannels.ConfigSetAdultContentStatus,
		(_evt, enabled: boolean) => ConfigService.setAdultContentEnabled(enabled),
	);

	ipcMain.handle(
		IpcChannels.ConfigGetBackgroundStyle,
		() => ConfigService.getBackgroundStyle(),
	);

	ipcMain.handle(
		IpcChannels.ConfigSetBackgroundStyle,
		(_evt, style: BackgroundStyle) => ConfigService.setBackgroundStyle(style),
	);

	// Retrieves the dev mode status
	ipcMain.handle(
		IpcChannels.ConfigGetDevModeStatus,
		() => ConfigService.isDevModeEnabled(),
	);

	// Retrieves the admin curation mode status.
	ipcMain.handle(
		IpcChannels.ConfigGetAdminModeStatus,
		() => ConfigService.isAdminModeEnabled(),
	);

	ipcMain.handle(
		IpcChannels.ConfigGetPreferredTitleLanguage,
		() => ConfigService.getPreferredTitleLanguage(),
	);

	ipcMain.handle(
		IpcChannels.ConfigSetPreferredTitleLanguage,
		(_evt, language: PreferredTitleLanguage) => ConfigService.setPreferredTitleLanguage(language),
	);

	ipcMain.handle(
		IpcChannels.ConfigGetCanvasDiagnosticsStatus,
		() => ConfigService.isCanvasDiagnosticsEnabled(),
	);

	ipcMain.handle(
		IpcChannels.ConfigSetCanvasDiagnosticsStatus,
		(_evt, enabled: boolean) => ConfigService.setCanvasDiagnosticsEnabled(enabled),
	);

	ipcMain.handle(
		IpcChannels.ConfigGetLibraryDisplayFilters,
		() => ConfigService.getLibraryDisplayFilters(),
	);

	ipcMain.handle(
		IpcChannels.ConfigSetLibraryDisplayFilters,
		(_evt, filters: LibraryDisplayFilters) => ConfigService.setLibraryDisplayFilters(filters),
	);

	ipcMain.handle(
		IpcChannels.ConfigGetLastRoute,
		() => ConfigService.getLastRoute(),
	);

	ipcMain.handle(
		IpcChannels.ConfigSetLastRoute,
		(_evt, route: string) => ConfigService.setLastRoute(route),
	);
}
