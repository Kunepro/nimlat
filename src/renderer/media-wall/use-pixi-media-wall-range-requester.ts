import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import {
	useCallback,
	useEffect,
	useRef,
} from "react";
import type {
	MediaWallDataSource,
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import { applyLoadedMediaWallRange } from "./media-wall-range-loader-effects";
import {
	advanceMediaWallRangeGeneration,
	createPendingRangeRequest,
	isSamePendingRangeRequest,
	type MediaWallPendingRangeRequest,
	resolveRangeRequestSettlement,
	resolveVisibleRangeRequest,
} from "./media-wall-range-loader-model";

interface UsePixiMediaWallRangeRequesterProps<TItem> {
	dataSource: MediaWallDataSource<TItem>;
	getItemSelectedRef: RefObject<PixiMediaWallHostProps<TItem>["getItemSelected"]>;
	layoutRef: RefObject<MediaWallLayout | null>;
	maximumRequestItems: number;
	onRangeLoadedRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoaded"]>;
	onRangeLoadErrorRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoadError"]>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	search: string;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
}

interface UsePixiMediaWallRangeRequesterResult {
	beginNextGeneration: () => number;
	cancelPostRangePaintRender: () => void;
	requestRange: (offset: number, limit: number, generation: number) => void;
	requestVisibleRange: (scrollTop: number) => void;
}

export function usePixiMediaWallRangeRequester<TItem>({
																												dataSource,
																												getItemSelectedRef,
																												layoutRef,
																						maximumRequestItems,
																												onRangeLoadedRef,
																												onRangeLoadErrorRef,
																												rangeRef,
																												renderer,
																												search,
																												setRangeState,
																											}: UsePixiMediaWallRangeRequesterProps<TItem>): UsePixiMediaWallRangeRequesterResult {
	const generationRef           = useRef(0);
	const mountedRef              = useRef(true);
	const postRangePaintRenderRef = useRef<number | null>(null);
	const pendingRequestRef       = useRef<MediaWallPendingRangeRequest | null>(null);

	useEffect(
		() => {
			mountedRef.current = true;

			return () => {
				mountedRef.current              = false;
				pendingRequestRef.current       = null;
				postRangePaintRenderRef.current = cancelPostRangePaintRenderFrame(postRangePaintRenderRef.current);
			};
		},
		[],
	);

	const beginNextGeneration = useCallback(
		() => {
			const generation          = advanceMediaWallRangeGeneration(generationRef.current);
			generationRef.current     = generation;
			pendingRequestRef.current = null;
			return generation;
		},
		[],
	);

	const settleRangeRequest = useCallback(
		(request: MediaWallPendingRangeRequest) => {
			const settlement          = resolveRangeRequestSettlement({
				activeGeneration:      generationRef.current,
				currentPendingRequest: pendingRequestRef.current,
				request,
			});
			pendingRequestRef.current = settlement.nextPendingRequest;
			return settlement.shouldHandle;
		},
		[],
	);

	const requestRange = useCallback(
		(offset: number, limit: number, generation: number) => {
			if (!mountedRef.current) {
				return;
			}

			const request = createPendingRangeRequest(
				offset,
				limit,
				generation,
			);
			if (isSamePendingRangeRequest(
				pendingRequestRef.current,
				request,
			)) {
				return;
			}

			pendingRequestRef.current = request;

			void dataSource.loadRange({
				offset: request.offset,
				limit:  request.limit,
				search,
			}).then((range) => {
				if (!mountedRef.current) {
					return;
				}
				if (!settleRangeRequest(request)) {
					return;
				}

				applyLoadedMediaWallRange({
					getItemSelected: getItemSelectedRef.current,
					range,
					rangeRef,
					renderer,
					postRangePaintRenderRef,
					onRangeLoaded:   onRangeLoadedRef.current,
					setRangeState,
				});
			})
				.catch((error: unknown) => {
					if (!mountedRef.current) {
						return;
					}
					if (!settleRangeRequest(request)) {
						return;
					}
					onRangeLoadErrorRef.current?.(error);
				});
		},
		[
			dataSource,
			getItemSelectedRef,
			onRangeLoadedRef,
			onRangeLoadErrorRef,
			rangeRef,
			renderer,
			search,
			setRangeState,
			settleRangeRequest,
		],
	);

	const requestVisibleRange = useCallback(
		(scrollTop: number) => {
			const currentLayout = layoutRef.current;
			if (!currentLayout) {
				return;
			}
			const pendingRequest = pendingRequestRef.current;
			const requested = resolveVisibleRangeRequest({
				layout: currentLayout,
				scrollTop,
				maximumRequestItems,
				pendingRequest: pendingRequest?.generation === generationRef.current
					? pendingRequest
					: null,
				range:  rangeRef.current,
			});
			if (!requested) {
				return;
			}

			requestRange(
				requested.offset,
				requested.limit,
				generationRef.current,
			);
		},
		[
			layoutRef,
			maximumRequestItems,
			rangeRef,
			requestRange,
		],
	);

	const cancelPostRangePaintRender = useCallback(
		() => {
			postRangePaintRenderRef.current = cancelPostRangePaintRenderFrame(postRangePaintRenderRef.current);
		},
		[],
	);

	return {
		beginNextGeneration,
		cancelPostRangePaintRender,
		requestRange,
		requestVisibleRange,
	};
}

function cancelPostRangePaintRenderFrame(frameId: number | null): null {
	if (frameId !== null && typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(frameId);
	}
	return null;
}
