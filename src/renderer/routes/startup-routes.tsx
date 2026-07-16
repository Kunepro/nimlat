import {
	type AnyRoute,
	createRoute,
	redirect,
} from "@tanstack/react-router";
import { ROUTES } from "../constants/route-config";
import DownloadPrecachedAnimeDb from "../features/download-precached-anime-db/DownloadPrecachedAnimeDb";
import {
	loadAnimeDbStartupReadiness,
	loadLastRoute,
} from "./startup-routes-runner";

async function resolveStartupRoute(): Promise<string> {
	const readiness = await loadAnimeDbStartupReadiness();
	if (!readiness.canUseLocalCatalog) {
		return ROUTES.DOWNLOAD_PRECACHED_ANIME_DB;
	}

	return await loadLastRoute() ?? ROUTES.GROUPS.FULL_URL;
}

export function createStartupRoutes<TRootRoute extends AnyRoute>(rootRoute: TRootRoute) {
	// Startup checks attached AnimeDB contents, not only config, so deleting
	// anime_data.db forces users back through the baseline download flow.
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path:           ROUTES.ROOT,
		beforeLoad:     async () => {
			throw redirect({
				href: await resolveStartupRoute(),
			});
		},
	});

	// Used for both first-start baseline download and Settings-triggered DB replacement.
	const downloadPrecachedAnimeDataRoute = createRoute({
		getParentRoute: () => rootRoute,
		path:           ROUTES.DOWNLOAD_PRECACHED_ANIME_DB,
		component:      DownloadPrecachedAnimeDb,
	});

	return [
		indexRoute,
		downloadPrecachedAnimeDataRoute,
	] as const;
}
