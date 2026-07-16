import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useEffect,
	useRef,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import {
	DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS,
	formatAnimeDbDownloadActionError,
	shouldAutoStartAnimeDbDownload,
} from "../download-precached-anime-db-model";
import {
	loadAnimeDbDownloadStatus,
	subscribeToAnimeDbDownloadProgressChanges,
} from "../download-precached-anime-db-runner";

interface AnimeDbDownloadProgressFeedInput {
	canUseLocalCatalog: boolean;
	hasLoadedStartupReadiness: boolean;
	setUiError: Dispatch<SetStateAction<string | null>>;
	startDownload: (ignoreAlreadyRunning: boolean) => Promise<void>;
}

// Progress events are the reactive source of truth for the first-run download.
// Initial status is loaded once so restarts can resume or preserve a user-canceled run.
export function useAnimeDbDownloadProgressFeed({
																								 canUseLocalCatalog,
																								 hasLoadedStartupReadiness,
																								 setUiError,
																								 startDownload,
																							 }: AnimeDbDownloadProgressFeedInput): AnimeDbDownloadProgressData {
	const isMountedRef              = useIsMountedRef();
	const hasAutoStarted            = useRef(false);
	const [ progress, setProgress ] = useState<AnimeDbDownloadProgressData>(DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS);

	useEffect(
		() => {
			const progressSubscription = subscribeToAnimeDbDownloadProgressChanges((nextProgress) => {
				if (isMountedRef.current) {
					setProgress(nextProgress);
				}
			});

			void loadAnimeDbDownloadStatus()
				.then((status) => {
					if (!isMountedRef.current) {
						return;
					}
					setProgress(status);
				})
				.catch((error: unknown) => {
					if (isMountedRef.current) {
						setUiError(formatAnimeDbDownloadActionError(
							error,
							"Failed to read AnimeDB download status.",
						));
					}
				});

			return () => {
				progressSubscription.unsubscribe();
			};
		},
		[
			isMountedRef,
			setUiError,
			startDownload,
		],
	);

	useEffect(
		() => {
			// Auto-download belongs only to missing-baseline startup. Visiting this route
			// from Preferences must never replace an already usable local catalog.
			if (
				hasLoadedStartupReadiness
				&& !canUseLocalCatalog
				&& !hasAutoStarted.current
				&& shouldAutoStartAnimeDbDownload(progress.status)
			) {
				hasAutoStarted.current = true;
				void startDownload(true);
			}
		},
		[
			canUseLocalCatalog,
			hasLoadedStartupReadiness,
			progress.status,
			startDownload,
		],
	);

	return progress;
}
