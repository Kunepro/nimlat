import { Provider as JotaiProvider } from "jotai";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "../../src/renderer/index.css";
import EpisodeUpdatesStatus from "../../src/renderer/components/episode-updates-status/EpisodeUpdatesStatus";
import ThemeProvider from "../../src/renderer/wrappers/ThemeProvider";

/**
 * Minimal renderer harness for one episode-updates status widget.
 * This keeps Electron E2E focused on the IPC -> main -> DB contract for Jikan status reasons.
 */
function EpisodeStatusE2EApp() {
	const params             = new URLSearchParams(window.location.search);
	const mediaId            = Number(params.get("mediaId"));
	const shouldStartOffline = params.get("offline") === "1";

	if (!Number.isFinite(mediaId)) {
		throw new Error("Missing valid mediaId query parameter for episode-status E2E renderer.");
	}

	// Seed the desired connectivity state before the widget performs its initial IPC read.
	window.electronAPI.network.sendConnectivityStatus(!shouldStartOffline);

	return (
		<JotaiProvider>
			<ThemeProvider>
				<EpisodeUpdatesStatus mediaId={ mediaId }/>
			</ThemeProvider>
		</JotaiProvider>
	);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Missing #root element for episode-status E2E renderer.");
}

createRoot(rootElement).render(
	<StrictMode>
		<EpisodeStatusE2EApp/>
	</StrictMode>,
);
