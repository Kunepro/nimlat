import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useRef,
	useState,
} from "react";
import { getMediaInspection } from "../../media-inspection-runner";

export interface MediaEpisodesInspectionRefreshController {
	media: MediaInspectionData | null;
	setMedia: Dispatch<SetStateAction<MediaInspectionData | null>>;
	isLoading: boolean;
	errorMessage: string | null;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	retryEpisodesLoad: () => void;
}

// Owns episode snapshot loading and stale-response arbitration. Event sources
// live in a companion hook so this unit remains focused on request ordering.
export function useMediaEpisodesInspectionRefresh(mediaIdNumber: number): MediaEpisodesInspectionRefreshController {
	const [ media, setMedia ]               = useState<MediaInspectionData | null>(null);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);
	const currentRefreshScope               = String(mediaIdNumber);
	// Silent hydration/list refreshes can overlap the visible page load. Data
	// requests arbitrate only successful snapshots; loader ids arbitrate only
	// the visible loading/error state, so a failed silent refresh cannot blank
	// an in-flight route load.
	const refreshScopeRef                  = useRef(currentRefreshScope);
	const refreshRequestIdRef              = useRef(0);
	const latestAppliedRefreshRequestIdRef = useRef(0);
	const loaderRequestIdRef               = useRef(0);
	refreshScopeRef.current                = currentRefreshScope;

	const refreshMedia = useCallback(
		async (showLoader: boolean = true) => {
			const requestScope          = currentRefreshScope;
			const requestId             = refreshRequestIdRef.current + 1;
			const loaderRequestId       = showLoader
				? loaderRequestIdRef.current + 1
				: loaderRequestIdRef.current;
			refreshRequestIdRef.current = requestId;
			if (showLoader) {
				loaderRequestIdRef.current = loaderRequestId;
			}
			try {
				if (showLoader) {
					setLoading(true);
				}
				setErrorMessage(null);
				const nextMedia = await getMediaInspection(mediaIdNumber);
				// Manual episode retries can overlap the later list-changed reload from the
				// hydrator. Only the newest snapshot may win, or a stale partial count can
				// keep the missing-episodes notice visible after the final episode arrives.
				if (
					requestScope === refreshScopeRef.current
					&& requestId > latestAppliedRefreshRequestIdRef.current
				) {
					latestAppliedRefreshRequestIdRef.current = requestId;
					setMedia(nextMedia);
				}
			} catch (error) {
				if (showLoader && loaderRequestId === loaderRequestIdRef.current && requestScope === refreshScopeRef.current) {
					setErrorMessage(error instanceof Error ? error.message : "Failed to load episodes.");
				}
			} finally {
				if (showLoader && loaderRequestId === loaderRequestIdRef.current && requestScope === refreshScopeRef.current) {
					setLoading(false);
				}
			}
		},
		[
			currentRefreshScope,
			mediaIdNumber,
		],
	);

	const retryEpisodesLoad = useCallback(
		() => {
			void refreshMedia(false);
		},
		[ refreshMedia ],
	);

	return {
		media,
		setMedia,
		isLoading,
		errorMessage,
		refreshMedia,
		retryEpisodesLoad,
	};
}
