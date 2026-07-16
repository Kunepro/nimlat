import {
	type AnyRoute,
	createRoute,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import GroupsExplorer from "../features/groups/groups-explorer/GroupsExplorer";
import IgnoredGroupsExplorer from "../features/groups/groups-explorer/IgnoredGroupsExplorer";
import GroupsShellLayout from "../features/groups/groups-shell/GroupsShellLayout";
import { createGroupDetailRouteTree } from "./groups-group-routes";
import {
	createGroupedMediaRoutes,
	createStandaloneMediaRoutes,
} from "./groups-media-routes";
import { createGroupsPeopleRoutes } from "./groups-people-routes";

export function createGroupsRoutes<TAppLayoutRoute extends AnyRoute>(appLayoutRoute: TAppLayoutRoute) {
	const groupsRoute = createRoute({
		getParentRoute: () => appLayoutRoute,
		path:           ROUTES.GROUPS.ROUTE_BASE,
		component:      GroupsShellLayout,
	});

	const groupsIndexRoute = createRoute({
		getParentRoute: () => groupsRoute,
		path:           "/",
		component:      GroupsExplorer,
	});

	const ignoredGroupsRoute = createRoute({
		getParentRoute: () => groupsRoute,
		path:           "ignored",
		component:      IgnoredGroupsExplorer,
	});

	return groupsRoute.addChildren([
		groupsIndexRoute,
		ignoredGroupsRoute,
		createStandaloneMediaRoutes(groupsRoute),
		...createGroupsPeopleRoutes(groupsRoute),
		createGroupDetailRouteTree(groupsRoute),
		createGroupedMediaRoutes(groupsRoute),
	]);
}
