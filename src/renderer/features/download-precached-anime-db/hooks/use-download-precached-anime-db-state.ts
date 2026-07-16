import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import { useMemo } from "react";
import {
	type AnimeDbDownloadProgressStatus,
	getAnimeDbDownloadProgressPercent,
	getAnimeDbDownloadProgressStatus,
	getVisibleAnimeDbDownloadUiError,
} from "../download-precached-anime-db-model";
import { useAnimeDbDownloadActions } from "./useAnimeDbDownloadActions";
import { useAnimeDbDownloadNavigation } from "./useAnimeDbDownloadNavigation";
import { useAnimeDbDownloadProgressFeed } from "./useAnimeDbDownloadProgressFeed";
import { useAnimeDbDownloadSetupFlags } from "./useAnimeDbDownloadSetupFlags";

export function useDownloadPrecachedAnimeDbState(): {
	progress: AnimeDbDownloadProgressData;
	progressPercent: number;
	progressStatus: AnimeDbDownloadProgressStatus;
	visibleUiError: string | null;
	isDevMode: boolean;
	canSkipToApp: boolean;
	canUseLocalCatalog: boolean;
	startDownload: (ignoreAlreadyRunning: boolean) => Promise<void>;
	cancelDownload: () => Promise<void>;
	goToApp: () => void;
	goToAniListBuilder: () => void;
} {
	const {
					isDevMode,
					canSkipToApp,
					canUseLocalCatalog,
					hasLoadedStartupReadiness,
				}        = useAnimeDbDownloadSetupFlags();
	const {
					uiError,
					setUiError,
					startDownload,
					cancelDownload,
				}        = useAnimeDbDownloadActions();
	const progress = useAnimeDbDownloadProgressFeed({
		canUseLocalCatalog,
		hasLoadedStartupReadiness,
		setUiError,
		startDownload,
	});
	const {
					goToApp,
					goToAniListBuilder,
				}        = useAnimeDbDownloadNavigation(progress.status);

	const progressPercent = useMemo(
		() => getAnimeDbDownloadProgressPercent(progress),
		[ progress ],
	);
	const progressStatus  = useMemo(
		() => getAnimeDbDownloadProgressStatus(progress.status),
		[ progress.status ],
	);
	const visibleUiError  = useMemo(
		() => getVisibleAnimeDbDownloadUiError(
			uiError,
			progress.errorMessage,
		),
		[
			progress.errorMessage,
			uiError,
		],
	);

	return {
		progress,
		progressPercent,
		progressStatus,
		visibleUiError,
		isDevMode,
		canSkipToApp,
		canUseLocalCatalog,
		startDownload,
		cancelDownload,
		goToApp,
		goToAniListBuilder,
	};
}
