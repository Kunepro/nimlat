import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import {
	formatAnimeDbDownloadActionError,
	isAlreadyRunningAnimeDbDownloadError,
} from "../download-precached-anime-db-model";
import {
	cancelAnimeDbDownload,
	startAnimeDbDownload,
} from "../download-precached-anime-db-runner";

interface AnimeDbDownloadActions {
	uiError: string | null;
	setUiError: Dispatch<SetStateAction<string | null>>;
	startDownload: (ignoreAlreadyRunning: boolean) => Promise<void>;
	cancelDownload: () => Promise<void>;
}

// Owns command failures from explicit user/download actions. Progress-state
// failures are intentionally kept in the progress payload and merged by the page hook.
export function useAnimeDbDownloadActions(): AnimeDbDownloadActions {
	const isMountedRef            = useIsMountedRef();
	const [ uiError, setUiError ] = useState<string | null>(null);

	const startDownload = useCallback(
		async (ignoreAlreadyRunning: boolean) => {
			setUiError(null);
			try {
				const result = await startAnimeDbDownload();
				if (!isMountedRef.current) {
					return;
				}
				if (!result.success && !(ignoreAlreadyRunning && isAlreadyRunningAnimeDbDownloadError(result.error))) {
					setUiError(result.error);
				}
			} catch (error) {
				if (isMountedRef.current) {
					setUiError(formatAnimeDbDownloadActionError(
						error,
						"Failed to start AnimeDB download.",
					));
				}
			}
		},
		[ isMountedRef ],
	);

	const cancelDownload = useCallback(
		async () => {
			setUiError(null);
			try {
				const result = await cancelAnimeDbDownload();
				if (isMountedRef.current && !result.success) {
					setUiError(result.error);
				}
			} catch (error) {
				if (isMountedRef.current) {
					setUiError(formatAnimeDbDownloadActionError(
						error,
						"Failed to cancel AnimeDB download.",
					));
				}
			}
		},
		[ isMountedRef ],
	);

	return {
		uiError,
		setUiError,
		startDownload,
		cancelDownload,
	};
}
