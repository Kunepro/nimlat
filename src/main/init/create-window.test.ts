// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getWindowBounds       = vi.fn();
const isDevModeEnabled      = vi.fn();
const loadURL               = vi.fn();
const openDevTools          = vi.fn();
const openExternal         = vi.fn();
const setMenuBarVisibility  = vi.fn();
const setApplicationMenu    = vi.fn();
const restoreMaximizedState = vi.fn();
const registerWindowBoundsPersistence = vi.fn();
const webContentsOn        = vi.fn();
const webContentsOnce       = vi.fn();
const setWindowOpenHandler = vi.fn();

const browserWindowInstances: Array<{
	autoHideMenuBar: boolean;
	webContents: {
		openDevTools: typeof openDevTools;
		on: typeof webContentsOn;
		once: typeof webContentsOnce;
		setWindowOpenHandler: typeof setWindowOpenHandler;
	};
	setMenuBarVisibility: typeof setMenuBarVisibility;
	loadURL: typeof loadURL;
	isDestroyed: () => boolean;
}> = [];

const BrowserWindowMock = vi.fn().mockImplementation(() => {
	const instance = {
		autoHideMenuBar: false,
		webContents:     {
			openDevTools,
			on: webContentsOn,
			once: webContentsOnce,
			setWindowOpenHandler,
		},
		setMenuBarVisibility,
		loadURL,
		isDestroyed: () => false,
	};
	browserWindowInstances.push(instance);
	return instance;
});

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config: {
				getWindowBounds,
				isDevModeEnabled,
			},
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		app:  {
			isPackaged: false,
		},
		BrowserWindow: BrowserWindowMock,
		Menu: {
			setApplicationMenu,
		},
		shell: {
			openExternal,
		},
	}),
);

vi.mock(
	"../../constants/main/system-folders",
	() => ({
		PATH_ICON: "icon.png",
		PATH_INDEX_HTML: "index.html",
		PATH_PRELOAD_JS: "preload.js",
	}),
);

vi.mock(
	"./persist-window-bounds",
	() => ({
		restoreMaximizedState,
		registerWindowBoundsPersistence,
	}),
);

describe(
	"createWindow",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			browserWindowInstances.length = 0;
			getWindowBounds.mockReturnValue(undefined);
			webContentsOnce.mockImplementation((_eventName, callback) => {
				callback();
			});
			openExternal.mockResolvedValue(undefined);
		});

		it(
			"hides the native app menu outside dev mode",
			async () => {
				isDevModeEnabled.mockReturnValue(false);

				const { createWindow } = await import("./create-window");
				createWindow();

				expect(BrowserWindowMock).toHaveBeenCalledTimes(1);
				expect(BrowserWindowMock).toHaveBeenCalledWith(expect.objectContaining({
					minWidth: 800,
					minHeight: 480,
				}));
				expect(setApplicationMenu).toHaveBeenCalledWith(null);
				expect(setMenuBarVisibility).toHaveBeenCalledWith(false);
				expect(browserWindowInstances[ 0 ]?.autoHideMenuBar).toBe(true);
				expect(openDevTools).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps the native app menu visible in dev mode and opens devtools",
			async () => {
				isDevModeEnabled.mockReturnValue(true);

				const { createWindow } = await import("./create-window");
				createWindow();

				expect(setApplicationMenu).not.toHaveBeenCalled();
				expect(setMenuBarVisibility).toHaveBeenCalledWith(true);
				expect(browserWindowInstances[ 0 ]?.autoHideMenuBar).toBe(false);
				expect(webContentsOnce).toHaveBeenCalledWith(
					"did-finish-load",
					expect.any(Function),
				);
				expect(openDevTools).toHaveBeenCalledTimes(1);
				expect(openDevTools).toHaveBeenCalledWith({
					mode:     "right",
					activate: true,
				});
			},
		);

		it(
			"denies renderer-created external windows and sends them through shell",
			async () => {
				isDevModeEnabled.mockReturnValue(false);

				const { createWindow } = await import("./create-window");
				createWindow();

				expect(setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));
				const handler = setWindowOpenHandler.mock.calls[ 0 ]?.[ 0 ];
				expect(handler?.({ url: "https://example.test/title" })).toEqual({ action: "deny" });
				expect(openExternal).toHaveBeenCalledWith("https://example.test/title");
			},
		);
	},
);
