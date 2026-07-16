import {
	createHashHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import App from "./App";
import AppLayout from "./features/AppLayout";
import NotFound404 from "./features/not-found/NotFound404";
import { createGroupsRoutes } from "./routes/groups-routes";
import { createStartupRoutes } from "./routes/startup-routes";
import { createToolRoutes } from "./routes/tool-routes";
import "./types/router-history-state";

const rootRoute = createRootRoute({
	component: App,
});

const appLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id:        "app-layout",
	component: AppLayout,
});

const catchAllRoute = createRoute({
	getParentRoute: () => rootRoute,
	path:           "*",
	component: NotFound404,
});

const startupRoutes = createStartupRoutes(rootRoute);
const toolRoutes    = createToolRoutes(appLayoutRoute);
const groupsRoute   = createGroupsRoutes(appLayoutRoute);

// Keep this module as the composition point only. Domain route declarations live
// in src/renderer/routes so future route work changes the owning feature slice.
const routeTree = rootRoute.addChildren([
	...startupRoutes,
	appLayoutRoute.addChildren([
		...toolRoutes,
		groupsRoute,
	]),
	catchAllRoute,
]);

export const router = createRouter({
	routeTree,
	history: createHashHistory(),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
