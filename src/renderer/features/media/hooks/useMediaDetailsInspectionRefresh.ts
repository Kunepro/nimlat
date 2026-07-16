import {
	useCallback,
	useRef,
	useState,
} from "react";
import {
	formatMediaDetailsLoadError,
	type MediaDetailsGroupSource,
} from "../media-details-explorer-model";
import {
	getMediaInspection,
	type MediaInspection,
} from "../media-inspection-runner";

export type MediaDetailsInspection = MediaInspection;
export type UpdateMediaDetailsInspection = (updater: (current: MediaDetailsInspection | null) => MediaDetailsInspection | null) => void;

export interface MediaDetailsInspectionRefreshController {
	errorMessage: string | null;
	isLoading: boolean;
	media: MediaDetailsInspection | null;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	updateMedia: UpdateMediaDetailsInspection;
}

interface MediaDetailsInspectionRefreshInput {
	mediaGroupSource: MediaDetailsGroupSource | undefined;
	numericMediaId: number;
}

// Owns compact media-detail snapshot loading and stale route arbitration. BUS
// subscriptions live in a companion hook so request ordering rules stay local.
export function useMediaDetailsInspectionRefresh({
																									 mediaGroupSource,
																									 numericMediaId,
																								 }: MediaDetailsInspectionRefreshInput): MediaDetailsInspectionRefreshController {
	const [ media, setMedia ]               = useState<MediaDetailsInspection | null>(null);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);
	const currentRefreshScope               = `${ numericMediaId }:${ mediaGroupSource ?? "standalone" }`;
	// Silent event refreshes must not invalidate an in-flight page load; the scope
	// rejects stale route responses while loader ids only arbitrate visible loads.
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
				const nextMedia = await getMediaInspection(
					numericMediaId,
					{
						includeEpisodes: false,
						groupSource:     mediaGroupSource,
					},
				);
				// Details can receive a BUS invalidation while the visible route load is
				// still pending. Only the newest same-route snapshot may update state.
				if (
					requestScope === refreshScopeRef.current
					&& requestId > latestAppliedRefreshRequestIdRef.current
				) {
					latestAppliedRefreshRequestIdRef.current = requestId;
					setMedia(nextMedia);
				}
			} catch (error) {
				if (showLoader && loaderRequestId === loaderRequestIdRef.current && requestScope === refreshScopeRef.current) {
					setErrorMessage(formatMediaDetailsLoadError(error));
				}
			} finally {
				if (showLoader && loaderRequestId === loaderRequestIdRef.current && requestScope === refreshScopeRef.current) {
					setLoading(false);
				}
			}
		},
		[
			currentRefreshScope,
			mediaGroupSource,
			numericMediaId,
		],
	);

	const updateMedia = useCallback<UpdateMediaDetailsInspection>(
		(updater) => {
			setMedia(updater);
		},
		[],
	);

	return {
		errorMessage,
		isLoading,
		media,
		refreshMedia,
		updateMedia,
	};
}
