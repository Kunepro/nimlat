import {
	useCallback,
	useEffect,
	useRef,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import { getMediaInspection } from "../media-inspection-runner";
import {
	createMediaLayoutInspectionSnapshot,
	type MediaLayoutInspectionSnapshot,
} from "../media-layout-model";

interface UseMediaLayoutInspectionSnapshotInput {
	mediaId: string;
	applyInspectionSnapshot: (snapshot: MediaLayoutInspectionSnapshot) => void;
}

interface MediaLayoutInspectionSnapshotController {
	refreshInspectionSnapshot: () => Promise<void>;
}

export function useMediaLayoutInspectionSnapshot({
																									 mediaId,
																									 applyInspectionSnapshot,
																								 }: UseMediaLayoutInspectionSnapshotInput): MediaLayoutInspectionSnapshotController {
	const isMountedRef                = useIsMountedRef();
	const refreshRequestIdRef         = useRef(0);
	const loadMediaInspectionSnapshot = useCallback(
		async (): Promise<MediaLayoutInspectionSnapshot | null> => {
			const media = await getMediaInspection(
				Number(mediaId),
				{ includeEpisodes: false },
			);
			return media ? createMediaLayoutInspectionSnapshot(media) : null;
		},
		[ mediaId ],
	);
	const refreshInspectionSnapshot   = useCallback(
		async () => {
			const requestId             = refreshRequestIdRef.current + 1;
			refreshRequestIdRef.current = requestId;

			try {
				const snapshot = await loadMediaInspectionSnapshot();
				if (!snapshot || !isMountedRef.current || requestId !== refreshRequestIdRef.current) {
					return;
				}
				applyInspectionSnapshot(snapshot);
			} catch {
				// Keep last known UI state to avoid visible title/header flicker.
			}
		},
		[
			applyInspectionSnapshot,
			isMountedRef,
			loadMediaInspectionSnapshot,
		],
	);

	useEffect(
		() => {
			void refreshInspectionSnapshot();
		},
		[ refreshInspectionSnapshot ],
	);

	return { refreshInspectionSnapshot };
}
