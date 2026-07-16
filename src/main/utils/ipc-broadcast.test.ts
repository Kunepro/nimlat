// @vitest-environment node
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

type MockWebContents = {
	isCrashed: Mock<() => boolean>;
	isDestroyed: Mock<() => boolean>;
	mainFrame: MockWebFrameMain;
};

type MockWebFrameMain = {
	detached: boolean;
	isDestroyed: Mock<() => boolean>;
	send: Mock<(channel: IpcChannels, ...payload: unknown[]) => void>;
};

type MockBrowserWindow = {
	isDestroyed: Mock<() => boolean>;
	webContents: MockWebContents;
};

const mocks = vi.hoisted(() => ({
	getAllWindows:       vi.fn<() => MockBrowserWindow[]>(),
	logMainServiceError: vi.fn(),
}));

vi.mock(
	"electron",
	() => ({
		BrowserWindow: {
			getAllWindows: mocks.getAllWindows,
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: mocks.logMainServiceError,
		},
	}),
);

function createWindow(options?: {
	destroyed?: boolean;
	frameDestroyed?: boolean;
	frameDetached?: boolean;
	rendererCrashed?: boolean;
	webContentsDestroyed?: boolean;
	send?: Mock<(channel: IpcChannels, ...payload: unknown[]) => void>;
}): MockBrowserWindow {
	return {
		isDestroyed: vi.fn(() => options?.destroyed ?? false),
		webContents: {
			isCrashed:   vi.fn(() => options?.rendererCrashed ?? false),
			isDestroyed: vi.fn(() => options?.webContentsDestroyed ?? false),
			mainFrame:   {
				detached:    options?.frameDetached ?? false,
				isDestroyed: vi.fn(() => options?.frameDestroyed ?? false),
				send:        options?.send ?? vi.fn(),
			},
		},
	};
}

describe(
	"broadcastToRendererWindows",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"sends the channel and payload to live renderer windows",
			async () => {
				const window = createWindow();
				mocks.getAllWindows.mockReturnValue([ window ]);

				const { broadcastToRendererWindows } = await import("./ipc-broadcast");
				broadcastToRendererWindows(
					IpcChannels.HydratorProgress,
					{ id: 10 },
				);

				expect(window.webContents.mainFrame.send).toHaveBeenCalledWith(
					IpcChannels.HydratorProgress,
					{ id: 10 },
				);
			},
		);

		it(
			"skips destroyed windows and unavailable main frames",
			async () => {
				const destroyedWindow         = createWindow({ destroyed: true });
				const destroyedContentsWindow = createWindow({ webContentsDestroyed: true });
				const crashedRendererWindow   = createWindow({ rendererCrashed: true });
				const destroyedFrameWindow    = createWindow({ frameDestroyed: true });
				const detachedFrameWindow     = createWindow({ frameDetached: true });
				const liveWindow              = createWindow();
				mocks.getAllWindows.mockReturnValue([
					destroyedWindow,
					destroyedContentsWindow,
					crashedRendererWindow,
					destroyedFrameWindow,
					detachedFrameWindow,
					liveWindow,
				]);

				const { broadcastToRendererWindows } = await import("./ipc-broadcast");
				broadcastToRendererWindows(IpcChannels.MediaHydrationQueueChanged);

				expect(destroyedWindow.webContents.mainFrame.send).not.toHaveBeenCalled();
				expect(destroyedContentsWindow.webContents.mainFrame.send).not.toHaveBeenCalled();
				expect(crashedRendererWindow.webContents.mainFrame.send).not.toHaveBeenCalled();
				expect(destroyedFrameWindow.webContents.mainFrame.send).not.toHaveBeenCalled();
				expect(detachedFrameWindow.webContents.mainFrame.send).not.toHaveBeenCalled();
				expect(liveWindow.webContents.mainFrame.send).toHaveBeenCalledWith(IpcChannels.MediaHydrationQueueChanged);
			},
		);

		it(
			"ignores Electron disposed-frame send races and continues broadcasting",
			async () => {
				const disposedFrameSend   = vi.fn(() => {
					throw new Error("Render frame was disposed before WebFrameMain could be accessed");
				});
				const disposedFrameWindow = createWindow({ send: disposedFrameSend });
				const liveWindow          = createWindow();
				mocks.getAllWindows.mockReturnValue([
					disposedFrameWindow,
					liveWindow,
				]);

				const { broadcastToRendererWindows } = await import("./ipc-broadcast");
				broadcastToRendererWindows(IpcChannels.MediaHydrationQueueChanged);

				expect(mocks.logMainServiceError).not.toHaveBeenCalled();
				expect(liveWindow.webContents.mainFrame.send).toHaveBeenCalledWith(IpcChannels.MediaHydrationQueueChanged);
			},
		);

		it(
			"logs unexpected send failures without blocking remaining windows",
			async () => {
				const sendError     = new Error("payload could not be cloned");
				const failingWindow = createWindow({
					send: vi.fn(() => {
						throw sendError;
					}),
				});
				const liveWindow    = createWindow();
				mocks.getAllWindows.mockReturnValue([
					failingWindow,
					liveWindow,
				]);

				const { broadcastToRendererWindows } = await import("./ipc-broadcast");
				broadcastToRendererWindows(IpcChannels.HydratorProgress);

				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"ipc-broadcast.renderer-send",
					sendError,
					{ channel: IpcChannels.HydratorProgress },
				);
				expect(liveWindow.webContents.mainFrame.send).toHaveBeenCalledWith(IpcChannels.HydratorProgress);
			},
		);
	},
);
