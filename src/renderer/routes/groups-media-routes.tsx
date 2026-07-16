import {
	type AnyRoute,
	createRoute,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import MediaEpisodesExplorer from "../features/media/media-episodes-explorer/MediaEpisodesExplorer";
import MediaCharactersExplorer from "../features/media/MediaCharactersExplorer";
import MediaDetailsExplorer from "../features/media/MediaDetailsExplorer";
import MediaDownloadExplorer from "../features/media/MediaDownloadExplorer";
import MediaLayout from "../features/media/MediaLayout";
import MediaStaffExplorer from "../features/media/MediaStaffExplorer";
import { createDefaultRouteRedirect } from "./default-route-redirect";

export function createStandaloneMediaRoutes<TParentRoute extends AnyRoute>(parentRoute: TParentRoute) {
	const standaloneMediaRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.ROUTE_BASE,
		component:      MediaLayout,
	});

	const standaloneMediaIndexRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           "/",
		beforeLoad:     createDefaultRouteRedirect(ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL),
	});

	const standaloneMediaDetailsRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS,
		component:      MediaDetailsExplorer,
	});

	const standaloneMediaEpisodesRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.EPISODES,
		component:      MediaEpisodesExplorer,
	});

	const standaloneMediaCharactersRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.CHARACTERS,
		component:      MediaCharactersExplorer,
	});

	const standaloneMediaStaffRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.STAFF,
		component:      MediaStaffExplorer,
	});

	const standaloneMediaDownloadRoute = createRoute({
		getParentRoute: () => standaloneMediaRoute,
		path:           ROUTES.GROUPS.STANDALONE_MEDIA.DOWNLOAD,
		component:      MediaDownloadExplorer,
	});

	return standaloneMediaRoute.addChildren([
		standaloneMediaIndexRoute,
		standaloneMediaDetailsRoute,
		standaloneMediaEpisodesRoute,
		standaloneMediaCharactersRoute,
		standaloneMediaStaffRoute,
		standaloneMediaDownloadRoute,
	]);
}

export function createGroupedMediaRoutes<TParentRoute extends AnyRoute>(parentRoute: TParentRoute) {
	const mediaRoute = createRoute({
		getParentRoute: () => parentRoute,
		path:           ROUTES.GROUPS.MEDIA.ROUTE_BASE,
		component:      MediaLayout,
	});

	const mediaIndexRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           "/",
		beforeLoad:     createDefaultRouteRedirect(ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL),
	});

	const mediaDetailsRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           ROUTES.GROUPS.MEDIA.DETAILS,
		component:      MediaDetailsExplorer,
	});

	const mediaEpisodesRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           ROUTES.GROUPS.MEDIA.EPISODES,
		component:      MediaEpisodesExplorer,
	});

	const mediaCharactersRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           ROUTES.GROUPS.MEDIA.CHARACTERS,
		component:      MediaCharactersExplorer,
	});

	const mediaStaffRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           ROUTES.GROUPS.MEDIA.STAFF,
		component:      MediaStaffExplorer,
	});

	const mediaDownloadRoute = createRoute({
		getParentRoute: () => mediaRoute,
		path:           ROUTES.GROUPS.MEDIA.DOWNLOAD,
		component:      MediaDownloadExplorer,
	});

	return mediaRoute.addChildren([
		mediaIndexRoute,
		mediaDetailsRoute,
		mediaEpisodesRoute,
		mediaCharactersRoute,
		mediaStaffRoute,
		mediaDownloadRoute,
	]);
}
