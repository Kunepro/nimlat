import { App as AntdApp } from "antd";
import fallbackMessage from "antd/es/message";

export type AppMessageApi = ReturnType<typeof AntdApp.useApp>["message"];

export function useAppMessage(): AppMessageApi {
	const { message } = AntdApp.useApp();

	// Runtime screens are wrapped by ThemeProvider/AntdApp. The fallback keeps
	// isolated hook tests and small renderer harnesses from needing the full app
	// shell while keeping static AntD message access centralized here only.
	return typeof message.error === "function" ? message : fallbackMessage;
}
