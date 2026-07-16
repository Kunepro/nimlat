import type { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	getMediaEpisodeUpdatesIssue,
	mediaEpisodeUpdatesListChanges,
	retryMediaEpisodeUpdates,
} from "../../../features/media/media-episode-updates-runner";
import {
	createRetryFailedIssue,
	createRetryPendingIssue,
	toEpisodeUpdatesRetryErrorMessage,
} from "../episode-updates-status-model";

interface UseEpisodeUpdatesStatusInput {
	mediaId: number;
	onRequestedRetry?: () => void;
}

interface EpisodeUpdatesStatusState {
	isRetrying: boolean;
	issue: MediaEpisodeUpdatesIssue | null;
	retryEpisodeUpdates: () => void;
}

// Owns renderer orchestration for one media's episode-update status. The component
// only renders the state; this hook handles IPC reads, event invalidation, and retry lifecycle.
export function useEpisodeUpdatesStatus({
																					mediaId,
																					onRequestedRetry,
																				}: UseEpisodeUpdatesStatusInput): EpisodeUpdatesStatusState {
	const [ issue, setIssue ]         = useState<MediaEpisodeUpdatesIssue | null>(null);
	const [ isRetrying, setRetrying ] = useState(false);
	const isMountedRef                = useRef(false);
	const latestRequestKeyRef         = useRef(0);

	useEffect(
		() => {
			isMountedRef.current = true;
			return () => {
				isMountedRef.current = false;
				latestRequestKeyRef.current += 1;
			};
		},
		[],
	);

	const refreshStatus = useCallback(
		async () => {
			const requestKey            = latestRequestKeyRef.current + 1;
			latestRequestKeyRef.current = requestKey;

			const nextIssue = await getMediaEpisodeUpdatesIssue(mediaId);
			if (isMountedRef.current && requestKey === latestRequestKeyRef.current) {
				setIssue(nextIssue);
			}
		},
		[ mediaId ],
	);

	useEffect(
		() => {
			void refreshStatus();
		},
		[ refreshStatus ],
	);

	useEffect(
		() => {
			const mediaEpisodesSubscription = mediaEpisodeUpdatesListChanges().subscribe((event) => {
				if (event.mediaId !== mediaId) {
					return;
				}
				void refreshStatus();
			});

			return () => {
				mediaEpisodesSubscription.unsubscribe();
			};
		},
		[
			mediaId,
			refreshStatus,
		],
	);

	const retryEpisodeUpdates = useCallback(
		() => {
			void (async () => {
				setRetrying(true);
				try {
					// This queues the full episode sync; that daemon reloads both
					// episode rows and the disjoint thumbnail enrichment pass.
					const result = await retryMediaEpisodeUpdates(mediaId);
					if (!isMountedRef.current) {
						return;
					}

					if (!result.success) {
						setIssue(createRetryFailedIssue(
							mediaId,
							result.error,
							issue?.retryCount || 0,
						));
						return;
					}

					setIssue(createRetryPendingIssue(mediaId));
					onRequestedRetry?.();
				} catch (error) {
					if (!isMountedRef.current) {
						return;
					}

					setIssue(createRetryFailedIssue(
						mediaId,
						toEpisodeUpdatesRetryErrorMessage(error),
						issue?.retryCount || 0,
					));
				} finally {
					if (isMountedRef.current) {
						setRetrying(false);
					}
				}
			})();
		},
		[
			mediaId,
			issue?.retryCount,
			onRequestedRetry,
		],
	);

	return {
		isRetrying,
		issue,
		retryEpisodeUpdates,
	};
}
