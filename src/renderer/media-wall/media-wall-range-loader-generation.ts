import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import type {
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";
import {
	createEmptyRange,
	readRememberedScrollTop,
	resolveInitialRequest,
} from "./media-wall-host.utils";
import { resetMediaWallRangeLoaderForDataGeneration } from "./media-wall-range-loader-effects";

interface StartMediaWallRangeLoaderGenerationOptions<TItem> {
	beginNextGeneration: () => number;
	maximumRequestItems: number;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	requestRange: (offset: number, limit: number, generation: number) => void;
	resetProjectorInteraction: () => void;
	resetTerminalInteraction: () => void;
	scrollContainer: HTMLDivElement | null;
	scrollMemoryKey: string;
	scrollTopRef: RefObject<number>;
	setFocusedIndex: Dispatch<SetStateAction<number | null>>;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
	setSelectedIndex: Dispatch<SetStateAction<number | null>>;
	size: MediaWallSize;
}

export interface StartedMediaWallRangeLoaderGeneration {
	generation: number;
	initialRequest: {
		offset: number;
		limit: number;
	};
	restoredScrollTop: number;
}

export function startMediaWallRangeLoaderGeneration<TItem>({
																														 beginNextGeneration,
																								 maximumRequestItems,
																														 pendingRestoreScrollTopRef,
																														 rangeRef,
																														 renderer,
																														 requestRange,
																														 resetProjectorInteraction,
																														 resetTerminalInteraction,
																														 scrollContainer,
																														 scrollMemoryKey,
																														 scrollTopRef,
																														 setFocusedIndex,
																														 setHoveredIndex,
																														 setOverlayScrollTop,
																														 setRangeState,
																														 setSelectedIndex,
																														 size,
																													 }: StartMediaWallRangeLoaderGenerationOptions<TItem>): StartedMediaWallRangeLoaderGeneration {
	const generation        = beginNextGeneration();
	const emptyRange        = createEmptyRange<TItem>();
	const restoredScrollTop = readRememberedScrollTop(scrollMemoryKey);

	// Starting a new data generation invalidates global item indexes. Reset the
	// renderer, React selection/focus state, and remembered scroll before asking
	// the data source for the first range of the new generation.
	resetMediaWallRangeLoaderForDataGeneration({
		emptyRange,
		pendingRestoreScrollTopRef,
		rangeRef,
		renderer,
		resetProjectorInteraction,
		resetTerminalInteraction,
		restoredScrollTop,
		scrollContainer,
		scrollTopRef,
		setFocusedIndex,
		setHoveredIndex,
		setOverlayScrollTop,
		setRangeState,
		setSelectedIndex,
	});

	const initialRequest = resolveInitialRequest(
		size,
		restoredScrollTop,
		maximumRequestItems,
	);
	requestRange(
		initialRequest.offset,
		initialRequest.limit,
		generation,
	);

	return {
		generation,
		initialRequest,
		restoredScrollTop,
	};
}
