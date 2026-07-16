import {
	type AnyRoute,
	createRoute,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import GroupDetailsExplorer from "../features/group/group-details-explorer/GroupDetailsExplorer";
import GroupMediaExplorer from "../features/group/group-media-explorer/GroupMediaExplorer";
import GroupReleaseTimeline from "../features/group/group-release-timeline/GroupReleaseTimeline";
import GroupLayout from "../features/group/GroupLayout";
import { createDefaultRouteRedirect } from "./default-route-redirect";

export function createGroupDetailRouteTree<TParentRoute extends AnyRoute>(parentRoute: TParentRoute) {
	const groupRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.GROUP.ROUTE_BASE,
		component:      GroupLayout,
	});

	const groupIndexRoute = createRoute({
		getParentRoute: () => groupRoute,
		path:           "/",
		beforeLoad:     createDefaultRouteRedirect(ROUTES.GROUPS.GROUP.FULL_URL),
	});

	const groupMediasRoute = createRoute({
		getParentRoute: () => groupRoute,
		path:           ROUTES.GROUPS.GROUP.MEDIAS,
		component:      GroupMediaExplorer,
	});

	const groupDetailsRoute = createRoute({
		getParentRoute: () => groupRoute,
		path:           ROUTES.GROUPS.GROUP.DETAILS,
		component:      GroupDetailsExplorer,
	});

	const groupReleaseTimelineRoute = createRoute({
		getParentRoute: () => groupRoute,
		path:           ROUTES.GROUPS.GROUP.TIMELINE,
		component:      GroupReleaseTimeline,
	});

	return groupRoute.addChildren([
		groupIndexRoute,
		groupMediasRoute,
		groupDetailsRoute,
		groupReleaseTimelineRoute,
	]);
}
