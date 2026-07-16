import { Provider as JotaiProvider } from "jotai";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import { initializeNetworkStatusService } from "./services/network-status-initializer";
import RouterProvider from "./wrappers/RouterProvider";
import ThemeProvider from "./wrappers/ThemeProvider";

// Initialize services
initializeNetworkStatusService();

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<JotaiProvider>
			<ThemeProvider>
				<RouterProvider/>
			</ThemeProvider>
		</JotaiProvider>
	</StrictMode>,
);
