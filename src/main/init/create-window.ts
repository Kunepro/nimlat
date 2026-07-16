import { UserDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	app,
	BrowserWindow,
	Menu,
} from "electron";
import {
	PATH_ICON,
	PATH_INDEX_HTML,
	PATH_PRELOAD_JS,
} from "../../constants/main/system-folders";
import { ExternalNavigationService } from "../services/external-navigation/external-navigation-service";
import {
	registerWindowBoundsPersistence,
	restoreMaximizedState,
} from "./persist-window-bounds";

let fatalRendererShutdownRequested = false;

export function createWindow(): void {
	const savedBounds = UserDbFacade.config.getWindowBounds();
	const isDevModeEnabled = UserDbFacade.config.isDevModeEnabled();

	const win = new BrowserWindow({
		width:     savedBounds?.width ?? 1680,
		height:    savedBounds?.height ?? 900,
		minWidth:  800,
		minHeight: 480,
		x:         savedBounds?.x,
		y:         savedBounds?.y,
		webPreferences: {
			nodeIntegration:  false,
			contextIsolation: true,
			preload:          PATH_PRELOAD_JS,
		},
		icon:           PATH_ICON,
	});

	configureWindowMenuVisibility(
		win,
		isDevModeEnabled,
	);

	const url = app.isPackaged ? `file://${ PATH_INDEX_HTML }` : "http://localhost:5173";

	registerExternalNavigationGuard(
		win,
		url,
	);
	registerRendererDiagnostics(
		win,
		url,
	);
	win.loadURL(url);

	openDevToolsIfDevModeIsEnabled(
		win,
		isDevModeEnabled,
	);
	restoreMaximizedState(
		win,
		savedBounds?.isMaximized,
	);
	registerWindowBoundsPersistence(win);
}

function registerExternalNavigationGuard(win: BrowserWindow, rendererUrl: string): void {
	win.webContents.setWindowOpenHandler(({ url }) => {
		void ExternalNavigationService.openExternalUrl(
			url,
			"external-navigation.window-open",
		);
		return { action: "deny" };
	});

	win.webContents.on(
		"will-navigate",
		(event, navigationUrl) => {
			if (isRendererNavigationUrl(
				navigationUrl,
				rendererUrl,
			)) {
				return;
			}

			event.preventDefault();
			void ExternalNavigationService.openExternalUrl(
				navigationUrl,
				"external-navigation.will-navigate",
			);
		},
	);
}

function isRendererNavigationUrl(navigationUrl: string, rendererUrl: string): boolean {
	try {
		const navigation = new URL(navigationUrl);
		const renderer   = new URL(rendererUrl);
		if (renderer.protocol === "file:") {
			return navigation.protocol === "file:" && navigation.pathname === renderer.pathname;
		}

		return navigation.origin === renderer.origin;
	} catch {
		return false;
	}
}

function getRendererDiagnostics(win: BrowserWindow, expectedUrl: string): Record<string, unknown> {
	const rendererProcessId = win.webContents.getOSProcessId();
	const rendererMetrics   = app.getAppMetrics().find(metric => metric.pid === rendererProcessId);

	return {
		windowId:      win.id,
		webContentsId: win.webContents.id,
		rendererProcessId,
		expectedUrl,
		currentUrl:    win.webContents.getURL(),
		isDestroyed:   win.isDestroyed(),
		isCrashed:     win.webContents.isCrashed(),
		isLoading:     win.webContents.isLoading(),
		rendererMemory: rendererMetrics?.memory,
	};
}

function registerRendererDiagnostics(win: BrowserWindow, expectedUrl: string): void {
	// Blank windows after overnight background work need a main-process breadcrumb:
	// renderer failure must be visible even when the renderer cannot draw or report its own error.
	win.webContents.on(
		"render-process-gone",
		(_event, details) => {
			if (details.reason === "clean-exit") {
				return;
			}

			LoggerUtils.logMainServiceError(
				"renderer.render-process-gone",
				new Error(`Renderer process gone: ${ details.reason }`),
				{
					...getRendererDiagnostics(
						win,
						expectedUrl,
					),
					reason:   details.reason,
					exitCode: details.exitCode,
				},
			);
			exitAfterFatalRendererLog();
		},
	);

	win.webContents.on(
		"unresponsive",
		() => {
			LoggerUtils.logMainServiceError(
				"renderer.unresponsive",
				new Error("Renderer became unresponsive."),
				getRendererDiagnostics(
					win,
					expectedUrl,
				),
			);
		},
	);

	win.webContents.on(
		"did-fail-load",
		(_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
			if (!isMainFrame || errorCode === -3) {
				return;
			}

			LoggerUtils.logMainServiceError(
				"renderer.did-fail-load",
				new Error(`Renderer failed to load: ${ errorDescription }`),
				{
					...getRendererDiagnostics(
						win,
						expectedUrl,
					),
					errorCode,
					errorDescription,
					validatedURL,
				},
			);
			exitAfterFatalRendererLog();
		},
	);
}

function exitAfterFatalRendererLog(): void {
	if (fatalRendererShutdownRequested) {
		return;
	}

	fatalRendererShutdownRequested = true;
	setImmediate(() => {
		app.exit(1);
	});
}

function configureWindowMenuVisibility(win: BrowserWindow, isDevModeEnabled: boolean): void {
	if (isDevModeEnabled) {
		win.setMenuBarVisibility(true);
		win.autoHideMenuBar = false;
		return;
	}

	Menu.setApplicationMenu(null);
	win.setMenuBarVisibility(false);
	win.autoHideMenuBar = true;
}

function openDevToolsIfDevModeIsEnabled(win: BrowserWindow, isDevModeEnabled: boolean): void {
	if (isDevModeEnabled) {
		// Open DevTools after the renderer finishes loading so startup timing changes do not swallow the request.
		win.webContents.once(
			"did-finish-load",
			() => {
				if (!win.isDestroyed()) {
					win.webContents.openDevTools({
						mode:     "right",
						activate: true,
					});
				}
			},
		);
	}
}
