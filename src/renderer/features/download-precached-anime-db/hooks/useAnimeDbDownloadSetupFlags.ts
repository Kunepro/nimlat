import {
	useEffect,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import {
	loadAnimeDbDownloadDevModeStatus,
	loadAnimeDbStartupReadiness,
} from "../download-precached-anime-db-runner";

export interface AnimeDbDownloadSetupFlags {
	isDevMode: boolean;
	canSkipToApp: boolean;
	canUseLocalCatalog: boolean;
	hasLoadedStartupReadiness: boolean;
}

// First-run setup gates combine user config and AnimeDB readiness. Keeping this
// separate prevents the download-progress hook from owning unrelated app-entry policy.
export function useAnimeDbDownloadSetupFlags(): AnimeDbDownloadSetupFlags {
	const isMountedRef                                  = useIsMountedRef();
	const [ isDevMode, setDevMode ]                     = useState(false);
	const [ canSkipToApp, setCanSkipToApp ]             = useState(false);
	const [ canUseLocalCatalog, setCanUseLocalCatalog ] = useState(false);
	const [ hasLoadedStartupReadiness, setHasLoadedStartupReadiness ] = useState(false);

	useEffect(
		() => {
			void loadAnimeDbDownloadDevModeStatus()
				.then((enabled) => {
					if (isMountedRef.current) {
						setDevMode(enabled);
					}
				})
				.catch(() => {
					if (isMountedRef.current) {
						setDevMode(false);
					}
				});

			void loadAnimeDbStartupReadiness()
				.then((readiness) => {
					if (!isMountedRef.current) {
						return;
					}
					setCanSkipToApp(readiness.canUseLocalCatalog || readiness.status === "empty");
					setCanUseLocalCatalog(readiness.canUseLocalCatalog);
					setHasLoadedStartupReadiness(true);
				})
				.catch(() => {
					if (!isMountedRef.current) {
						return;
					}
					setCanSkipToApp(false);
					setCanUseLocalCatalog(false);
					setHasLoadedStartupReadiness(true);
				});
		},
		[ isMountedRef ],
	);

	return {
		isDevMode,
		canSkipToApp,
		canUseLocalCatalog,
		hasLoadedStartupReadiness,
	};
}
