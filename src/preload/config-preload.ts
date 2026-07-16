import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	BackgroundStyle,
	LibraryDisplayFilters,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const userConfigApi = {
	userConfig: {
		getAnimeDbVersion:                () => ipcRenderer.invoke(
			IpcChannels.ConfigGetAnimeDbVersion,
		),
		setAnimeDbVersion:                (version: string) => ipcRenderer.invoke(
			IpcChannels.ConfigSetAnimeDbVersion,
			version,
		),
		getAdultContentStatus:            () => ipcRenderer.invoke(
			IpcChannels.ConfigGetAdultContentStatus,
		),
		setAdultContentStatus:            (enabled: boolean) => ipcRenderer.invoke(
			IpcChannels.ConfigSetAdultContentStatus,
			enabled,
		),
		onAdultContentStatusChanged:      (callback: (enabled: boolean) => void) => {
			const subscription = (_event: IpcRendererEvent, enabled: boolean) => {
				callback(enabled);
			};

			ipcRenderer.on(
				IpcChannels.ConfigAdultContentChanged,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ConfigAdultContentChanged,
					subscription,
				);
			};
		},
		getBackgroundStyle:               () => ipcRenderer.invoke(
			IpcChannels.ConfigGetBackgroundStyle,
		),
		setBackgroundStyle:               (style: BackgroundStyle) => ipcRenderer.invoke(
			IpcChannels.ConfigSetBackgroundStyle,
			style,
		),
		onBackgroundStyleChanged:         (callback: (style: BackgroundStyle) => void) => {
			const subscription = (_event: IpcRendererEvent, style: BackgroundStyle) => {
				callback(style);
			};

			ipcRenderer.on(
				IpcChannels.ConfigBackgroundStyleChanged,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ConfigBackgroundStyleChanged,
					subscription,
				);
			};
		},
		getDevModeStatus:                 () => ipcRenderer.invoke(
			IpcChannels.ConfigGetDevModeStatus,
		),
		getAdminModeStatus:              () => ipcRenderer.invoke(
			IpcChannels.ConfigGetAdminModeStatus,
		),
		getPreferredTitleLanguage:       () => ipcRenderer.invoke(
			IpcChannels.ConfigGetPreferredTitleLanguage,
		),
		setPreferredTitleLanguage:       (language: PreferredTitleLanguage) => ipcRenderer.invoke(
			IpcChannels.ConfigSetPreferredTitleLanguage,
			language,
		),
		onPreferredTitleLanguageChanged: (callback: (language: PreferredTitleLanguage) => void) => {
			const subscription = (_event: IpcRendererEvent, language: PreferredTitleLanguage) => {
				callback(language);
			};

			ipcRenderer.on(
				IpcChannels.ConfigPreferredTitleLanguageChanged,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ConfigPreferredTitleLanguageChanged,
					subscription,
				);
			};
		},
		getCanvasDiagnosticsStatus:       () => ipcRenderer.invoke(
			IpcChannels.ConfigGetCanvasDiagnosticsStatus,
		),
		setCanvasDiagnosticsStatus:       (enabled: boolean) => ipcRenderer.invoke(
			IpcChannels.ConfigSetCanvasDiagnosticsStatus,
			enabled,
		),
		onCanvasDiagnosticsStatusChanged: (callback: (enabled: boolean) => void) => {
			const subscription = (_event: IpcRendererEvent, enabled: boolean) => {
				callback(enabled);
			};

			ipcRenderer.on(
				IpcChannels.ConfigCanvasDiagnosticsChanged,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ConfigCanvasDiagnosticsChanged,
					subscription,
				);
			};
		},
		getLibraryDisplayFilters:         () => ipcRenderer.invoke(
			IpcChannels.ConfigGetLibraryDisplayFilters,
		),
		setLibraryDisplayFilters:         (filters: LibraryDisplayFilters) => ipcRenderer.invoke(
			IpcChannels.ConfigSetLibraryDisplayFilters,
			filters,
		),
		getLastRoute:                     () => ipcRenderer.invoke(
			IpcChannels.ConfigGetLastRoute,
		),
		setLastRoute:                     (route: string) => ipcRenderer.invoke(
			IpcChannels.ConfigSetLastRoute,
			route,
		),
	},
};
