import {
  PATH_ICON,
  PATH_INDEX_HTML,
  PATH_PRELOAD_JS,
} from '@nimlat/const/main/system-folders';
import {
	app,
	BrowserWindow,
} from "electron";

export function createWindow(): void {
	const win = new BrowserWindow({
		width:          1680,
		height:         900,
		webPreferences: {
			nodeIntegration:  false,
			contextIsolation: true,
			preload:          PATH_PRELOAD_JS,
		},
		icon:           PATH_ICON,
	});
	
	const url = app.isPackaged ? `file://${ PATH_INDEX_HTML }` : "http://localhost:5173";
	
	win.loadURL(url);
	
	// openDevToolsIfDevModeIsEnabled(win);
}

// function openDevToolsIfDevModeIsEnabled(win: BrowserWindow): void {
// 	const isDevModeEnabled = UserDbFacade.config.isDevModeEnabled();
//
// 	if (isDevModeEnabled) win.webContents.openDevTools();
// }
