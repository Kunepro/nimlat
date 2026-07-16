import {
	type AnyRoute,
	createRoute,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import ErroredContent from "../features/errored-content/ErroredContent";
import PopulateAnimeDb from "../features/populate-anime-db/PopulateAnimeDb";
import ReleaseWatch from "../features/release-watch/ReleaseWatch";
import ToolPageLayout from "../features/tool-page/ToolPageLayout";

export function createToolRoutes<TAppLayoutRoute extends AnyRoute>(appLayoutRoute: TAppLayoutRoute) {
	const populateAnimeDbRoute = createRoute({
		getParentRoute: () => appLayoutRoute,
		path:           ROUTES.POPULATE_ANIME_DB,
		component:      () => <ToolPageLayout title="Catalog Scanner"/>,
	});

	const populateAnimeDbIndexRoute = createRoute({
		getParentRoute: () => populateAnimeDbRoute,
		path:           "/",
		component:      PopulateAnimeDb,
	});

	const releaseWatchRoute = createRoute({
		getParentRoute: () => appLayoutRoute,
		path:           ROUTES.RELEASE_WATCH.ROUTE_BASE,
		component:      () => <ToolPageLayout title="Release Watch"/>,
	});

	const releaseWatchIndexRoute = createRoute({
		getParentRoute: () => releaseWatchRoute,
		path:           "/",
		component:      ReleaseWatch,
	});

	const erroredContentRoute = createRoute({
		getParentRoute: () => appLayoutRoute,
		path:           ROUTES.ERRORED_CONTENT.ROUTE_BASE,
		component:      () => <ToolPageLayout title="Errored Content"/>,
	});

	const erroredContentIndexRoute = createRoute({
		getParentRoute: () => erroredContentRoute,
		path:           "/",
		component:      ErroredContent,
	});

	return [
		populateAnimeDbRoute.addChildren([ populateAnimeDbIndexRoute ]),
		erroredContentRoute.addChildren([ erroredContentIndexRoute ]),
		releaseWatchRoute.addChildren([ releaseWatchIndexRoute ]),
	] as const;
}
