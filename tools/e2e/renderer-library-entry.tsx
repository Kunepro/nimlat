import {
	createHashHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { Provider as JotaiProvider } from "jotai";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "../../src/renderer/index.css";
import GroupsExplorer from "../../src/renderer/features/groups/groups-explorer/GroupsExplorer";
import GroupsShellLayout from "../../src/renderer/features/groups/groups-shell/GroupsShellLayout";
import { useToasterMessages } from "../../src/renderer/hooks";
import ThemeProvider from "../../src/renderer/wrappers/ThemeProvider";

const rootRoute = createRootRoute({
	component: GroupsShellLayout,
});

const libraryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path:           "/",
	component:      GroupsExplorer,
});

const router = createRouter({
	routeTree: rootRoute.addChildren([ libraryRoute ]),
	history:   createHashHistory(),
});

function LibraryE2EApp() {
	useToasterMessages();

	return <RouterProvider router={ router }/>;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Missing #root element for library E2E renderer.");
}

createRoot(rootElement).render(
	<StrictMode>
		<JotaiProvider>
			<ThemeProvider>
				<LibraryE2EApp/>
			</ThemeProvider>
		</JotaiProvider>
	</StrictMode>,
);
