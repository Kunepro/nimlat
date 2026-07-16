import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	BrowserWindow,
	type WebFrameMain,
} from "electron";

const DISPOSED_FRAME_ERROR_MESSAGE = "Render frame was disposed before WebFrameMain could be accessed";

function isDisposedFrameSendError(error: unknown): boolean {
	return error instanceof Error && error.message.includes(DISPOSED_FRAME_ERROR_MESSAGE);
}

function resolveLiveMainFrame(window: BrowserWindow): WebFrameMain | null {
	if (window.isDestroyed()) {
		return null;
	}

	const { webContents } = window;
	if (webContents.isDestroyed() || webContents.isCrashed()) {
		return null;
	}

	const { mainFrame } = webContents;
	if (mainFrame.isDestroyed() || mainFrame.detached) {
		return null;
	}

	return mainFrame;
}

// Centralizes renderer fan-out so long-running daemons do not spam logs when a
// window reloads/closes between Electron's window lookup and the actual IPC send.
export function broadcastToRendererWindows(channel: IpcChannels, ...payload: unknown[]): void {
	for (const window of BrowserWindow.getAllWindows()) {
		try {
			const mainFrame = resolveLiveMainFrame(window);
			if (!mainFrame) {
				continue;
			}

			// Sending through the checked main frame avoids Electron's noisy
			// webContents-to-WebFrameMain handoff when reload/close races dispose the frame.
			mainFrame.send(
				channel,
				...payload,
			);
		} catch (error) {
			if (isDisposedFrameSendError(error)) {
				continue;
			}

			LoggerUtils.logMainServiceError(
				"ipc-broadcast.renderer-send",
				error instanceof Error
					? error
					: new Error(String(error)),
				{ channel },
			);
		}
	}
}
