import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import {
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import type {
	MediaWallDataSource,
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import {
	restorePendingMediaWallScrollTopAfterLayout,
	syncMediaWallSelectedIndexes,
} from "./media-wall-range-loader-effects";
import { startMediaWallRangeLoaderGeneration } from "./media-wall-range-loader-generation";
import { resolveReloadRangeRequest } from "./media-wall-range-loader-model";
import { usePixiMediaWallRangeRequester } from "./use-pixi-media-wall-range-requester";

interface UsePixiMediaWallRangeLoaderProps<TItem> {
	dataKey: string;
	dataSource: MediaWallDataSource<TItem>;
	getItemSelected: PixiMediaWallHostProps<TItem>["getItemSelected"];
	getItemSelectedRef: RefObject<PixiMediaWallHostProps<TItem>["getItemSelected"]>;
	layout: MediaWallLayout;
	layoutRef: RefObject<MediaWallLayout | null>;
	maximumRequestItems: number;
	onRangeLoadedRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoaded"]>;
	onRangeLoadErrorRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoadError"]>;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	rangeState: MediaWallLoadedRange<TItem>;
	reloadKey: PixiMediaWallHostProps<TItem>["reloadKey"];
	renderer: MediaWallRenderer<TItem>;
	resetProjectorInteraction: () => void;
	resetTerminalInteraction: () => void;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollMemoryKey: string;
	scrollTopRef: RefObject<number>;
	search: string;
	setFocusedIndex: Dispatch<SetStateAction<number | null>>;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
	setSelectedIndex: Dispatch<SetStateAction<number | null>>;
	size: MediaWallSize;
	sizeRef: RefObject<MediaWallSize>;
	visualStateKey: PixiMediaWallHostProps<TItem>["visualStateKey"];
}

export function usePixiMediaWallRangeLoader<TItem>({
																										 dataKey,
																										 dataSource,
																										 getItemSelected,
																										 getItemSelectedRef,
																										 layout,
																										 layoutRef,
																				 maximumRequestItems,
																										 onRangeLoadedRef,
																										 onRangeLoadErrorRef,
																										 pendingRestoreScrollTopRef,
																										 rangeRef,
																										 rangeState,
																										 reloadKey,
																										 renderer,
																										 resetProjectorInteraction,
																										 resetTerminalInteraction,
																										 scrollContainerRef,
																										 scrollMemoryKey,
																										 scrollTopRef,
																										 search,
																										 setFocusedIndex,
																										 setHoveredIndex,
																										 setOverlayScrollTop,
																										 setRangeState,
																										 setSelectedIndex,
																										 size,
																										 sizeRef,
																										 visualStateKey,
																									 }: UsePixiMediaWallRangeLoaderProps<TItem>): {
	requestVisibleRange: (scrollTop: number) => void;
} {
	const lastReloadKeyRef = useRef(reloadKey);
	const {
					beginNextGeneration,
					cancelPostRangePaintRender,
					requestRange,
					requestVisibleRange,
				}                = usePixiMediaWallRangeRequester({
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
	});

	useEffect(
		() => {
			renderer.setItems(rangeRef.current);
			renderer.render();
		},
		[
			rangeRef,
			renderer,
			visualStateKey,
		],
	);

	useEffect(
		() => {
			startMediaWallRangeLoaderGeneration({
				beginNextGeneration,
				maximumRequestItems,
				pendingRestoreScrollTopRef,
				rangeRef,
				renderer,
				requestRange,
				resetProjectorInteraction,
				resetTerminalInteraction,
				scrollContainer: scrollContainerRef.current,
				scrollMemoryKey,
				scrollTopRef,
				setFocusedIndex,
				setHoveredIndex,
				setOverlayScrollTop,
				setRangeState,
				setSelectedIndex,
				size:            sizeRef.current,
			});
		},
		[
			beginNextGeneration,
			dataKey,
			maximumRequestItems,
			pendingRestoreScrollTopRef,
			rangeRef,
			renderer,
			requestRange,
			resetProjectorInteraction,
			resetTerminalInteraction,
			scrollContainerRef,
			scrollMemoryKey,
			scrollTopRef,
			search,
			setFocusedIndex,
			setHoveredIndex,
			setOverlayScrollTop,
			setRangeState,
			setSelectedIndex,
			sizeRef,
		],
	);

	useLayoutEffect(
		() => {
			restorePendingMediaWallScrollTopAfterLayout({
				layout,
				pendingRestoreScrollTopRef,
				renderer,
				scrollContainer: scrollContainerRef.current,
				scrollTopRef,
				size,
			});
		},
		[
			layout,
			pendingRestoreScrollTopRef,
			renderer,
			scrollContainerRef,
			scrollTopRef,
			size,
		],
	);

	useEffect(
		() => {
			syncMediaWallSelectedIndexes({
				getItemSelected,
				range: rangeRef.current,
				renderer,
			});
		},
		[
			getItemSelected,
			rangeRef,
			rangeState,
			renderer,
		],
	);

	useEffect(
		() => {
			if (reloadKey === undefined || Object.is(
				lastReloadKeyRef.current,
				reloadKey,
			)) {
				return;
			}
			lastReloadKeyRef.current = reloadKey;
			const generation         = beginNextGeneration();
			const requested          = resolveReloadRangeRequest(
				layoutRef.current,
				scrollTopRef.current,
				maximumRequestItems,
			);
			requestRange(
				requested.offset,
				requested.limit,
				generation,
			);
		},
		[
			beginNextGeneration,
			layoutRef,
			maximumRequestItems,
			reloadKey,
			requestRange,
			scrollTopRef,
		],
	);

	useEffect(
		() => {
			requestVisibleRange(scrollTopRef.current);
		},
		[
			layout,
			requestVisibleRange,
			scrollTopRef,
		],
	);

	useEffect(
		() => () => {
			cancelPostRangePaintRender();
		},
		[ cancelPostRangePaintRender ],
	);

	return { requestVisibleRange };
}
