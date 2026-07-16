import {
	useCallback,
	useEffect,
	useState,
} from "react";
import { EPISODE_REFRESH_SETTLE_PROBE_LIMIT } from "../media-episodes-explorer-model";

interface MediaEpisodeRefreshWatcherOptions {
	hasPartialEpisodeList: boolean;
	isEpisodeUpdateActive: boolean;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
}

interface MediaEpisodeRefreshWatcher {
	handleEpisodeRefreshRequested: () => void;
}

export function useMediaEpisodeRefreshWatcher({
																								hasPartialEpisodeList,
																								isEpisodeUpdateActive,
																								refreshMedia,
																							}: MediaEpisodeRefreshWatcherOptions): MediaEpisodeRefreshWatcher {
	const [ isWatchingEpisodeRefresh, setWatchingEpisodeRefresh ]   = useState(false);
	const [ episodeRefreshProbeCount, setEpisodeRefreshProbeCount ] = useState(0);

	const probeEpisodes = useCallback(
		() => {
			void refreshMedia(false).finally(() => {
				setEpisodeRefreshProbeCount((current) => current + 1);
			});
		},
		[ refreshMedia ],
	);

	const handleEpisodeRefreshRequested = useCallback(
		() => {
			setWatchingEpisodeRefresh(true);
			setEpisodeRefreshProbeCount(0);
			probeEpisodes();
		},
		[ probeEpisodes ],
	);

	useEffect(
		() => {
			if (!isWatchingEpisodeRefresh) {
				return;
			}

			if (!hasPartialEpisodeList) {
				setWatchingEpisodeRefresh(false);
				setEpisodeRefreshProbeCount(0);
				return;
			}

			if (!isEpisodeUpdateActive && episodeRefreshProbeCount >= EPISODE_REFRESH_SETTLE_PROBE_LIMIT) {
				setWatchingEpisodeRefresh(false);
				setEpisodeRefreshProbeCount(0);
				return;
			}

			// Manual episode refreshes finish in the main-process hydrator. Polling only
			// while that retry is active makes the partial notice disappear even if the
			// final list-changed event arrives before this routed page receives it.
			const intervalId = window.setInterval(
				probeEpisodes,
				1500,
			);

			return () => {
				window.clearInterval(intervalId);
			};
		},
		[
			episodeRefreshProbeCount,
			hasPartialEpisodeList,
			isEpisodeUpdateActive,
			isWatchingEpisodeRefresh,
			probeEpisodes,
		],
	);

	return { handleEpisodeRefreshRequested };
}
