import type { AnimeDbDownloadReleaseStatus } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	createLocalAnimeDbReleaseStatus,
	formatUnknownError,
} from "../app-update-preferences-model";
import { loadAnimeDbReleaseStatus } from "../app-update-preferences-runner";

interface UseAnimeDbReleaseStatusResult {
	animeDbReleaseStatus: AnimeDbDownloadReleaseStatus | null;
	isAnimeDbReleaseStatusLoading: boolean;
	checkAnimeDbReleaseStatus: () => void;
}

export function useAnimeDbReleaseStatus(isPreferencesOpen = true): UseAnimeDbReleaseStatusResult {
	const [ animeDbReleaseStatus, setAnimeDbReleaseStatus ]                 = useState<AnimeDbDownloadReleaseStatus | null>(null);
	const [ isAnimeDbReleaseStatusLoading, setAnimeDbReleaseStatusLoading ] = useState(false);
	const activeRequestIdRef = useRef(0);

	// Release checks are user-repeatable because the Preferences modal stays mounted while hidden.
	// A one-shot mount effect would otherwise keep a stale installed/latest comparison after a download.
	const checkAnimeDbReleaseStatus = useCallback(
		() => {
			const requestId            = activeRequestIdRef.current + 1;
			activeRequestIdRef.current = requestId;
			setAnimeDbReleaseStatusLoading(true);
			void loadAnimeDbReleaseStatus()
				.then((nextStatus) => {
					if (activeRequestIdRef.current === requestId) {
						setAnimeDbReleaseStatus(nextStatus);
					}
				})
				.catch((error: unknown) => {
					if (activeRequestIdRef.current === requestId) {
						setAnimeDbReleaseStatus(createLocalAnimeDbReleaseStatus(formatUnknownError(
							error,
							"Failed to check AnimeDB release status.",
						)));
					}
				})
				.finally(() => {
					if (activeRequestIdRef.current === requestId) {
						setAnimeDbReleaseStatusLoading(false);
					}
				});
		},
		[],
	);

	useEffect(
		() => {
			if (!isPreferencesOpen) {
				return;
			}
			checkAnimeDbReleaseStatus();
			return () => {
				activeRequestIdRef.current += 1;
			};
		},
		[
			checkAnimeDbReleaseStatus,
			isPreferencesOpen,
		],
	);

	return {
		animeDbReleaseStatus,
		isAnimeDbReleaseStatusLoading,
		checkAnimeDbReleaseStatus,
	};
}
