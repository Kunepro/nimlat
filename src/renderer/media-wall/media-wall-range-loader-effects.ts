import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";
import {
	clampNumber,
	resolveSelectedIndexes,
	schedulePostRangePaintRender,
} from "./media-wall-host.utils";

interface ApplyLoadedMediaWallRangeOptions<TItem> {
	getItemSelected: ((item: TItem) => boolean) | undefined;
	onRangeLoaded: ((range: MediaWallLoadedRange<TItem>) => void) | undefined;
	postRangePaintRenderRef: RefObject<number | null>;
	range: MediaWallLoadedRange<TItem>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
}

interface ResetMediaWallRendererOptions<TItem> {
	emptyRange: MediaWallLoadedRange<TItem>;
	renderer: MediaWallRenderer<TItem>;
	restoredScrollTop: number;
}

interface ResetMediaWallRangeLoaderOptions<TItem> {
	emptyRange: MediaWallLoadedRange<TItem>;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	resetProjectorInteraction: () => void;
	resetTerminalInteraction: () => void;
	restoredScrollTop: number;
	scrollContainer: HTMLDivElement | null;
	scrollTopRef: RefObject<number>;
	setFocusedIndex: Dispatch<SetStateAction<number | null>>;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
	setSelectedIndex: Dispatch<SetStateAction<number | null>>;
}

interface RestorePendingMediaWallScrollTopOptions<TItem> {
	layout: MediaWallLayout;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	renderer: MediaWallRenderer<TItem>;
	scrollContainer: HTMLDivElement | null;
	scrollTopRef: RefObject<number>;
	size: MediaWallSize;
}

interface SyncMediaWallSelectedIndexesOptions<TItem> {
	getItemSelected: ((item: TItem) => boolean) | undefined;
	range: MediaWallLoadedRange<TItem>;
	renderer: MediaWallRenderer<TItem>;
}

// Range delivery updates both React state and the Pixi renderer. Keeping the
// mutation list together prevents future refactors from updating only one side.
export function applyLoadedMediaWallRange<TItem>({
																									 getItemSelected,
																									 onRangeLoaded,
																									 postRangePaintRenderRef,
																									 range,
																									 rangeRef,
																									 renderer,
																									 setRangeState,
																								 }: ApplyLoadedMediaWallRangeOptions<TItem>): void {
	rangeRef.current = range;
	setRangeState(range);
	renderer.setItems(range);
	syncMediaWallSelectedIndexes({
		getItemSelected,
		range,
		renderer,
	});
	renderer.render();
	onRangeLoaded?.(range);
	schedulePostRangePaintRender(
		renderer,
		postRangePaintRenderRef,
	);
}

function resetMediaWallRendererForDataGeneration<TItem>({
																													emptyRange,
																													renderer,
																													restoredScrollTop,
																												}: ResetMediaWallRendererOptions<TItem>): void {
	renderer.setItems(emptyRange);
	renderer.setScrollTop(restoredScrollTop);
	renderer.setHoveredIndex(null);
	renderer.setExitingIndex(null);
	renderer.setSelectedIndex(null);
	renderer.setSelectedIndexes(new Set());
	renderer.setActionTerminalState(null);
	renderer.setFocusedIndex(null);
	renderer.render();
}

// A data-generation reset is deliberately broader than clearing loaded items:
// pointer/focus/terminal/projector state all reference global indexes that can
// point at different media after the new range arrives.
export function resetMediaWallRangeLoaderForDataGeneration<TItem>({
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
																																	}: ResetMediaWallRangeLoaderOptions<TItem>): void {
	rangeRef.current = emptyRange;
	setRangeState(emptyRange);
	setHoveredIndex(null);
	setSelectedIndex(null);
	setFocusedIndex(null);
	resetTerminalInteraction();
	setOverlayScrollTop(0);
	resetProjectorInteraction();
	pendingRestoreScrollTopRef.current = restoredScrollTop > 0 ? restoredScrollTop : null;
	scrollTopRef.current               = restoredScrollTop;
	scrollContainer?.scrollTo({ top: restoredScrollTop });
	resetMediaWallRendererForDataGeneration({
		emptyRange,
		renderer,
		restoredScrollTop,
	});
}

export function restorePendingMediaWallScrollTopAfterLayout<TItem>({
																																		 layout,
																																		 pendingRestoreScrollTopRef,
																																		 renderer,
																																		 scrollContainer,
																																		 scrollTopRef,
																																		 size,
																																	 }: RestorePendingMediaWallScrollTopOptions<TItem>): boolean {
	const pendingScrollTop = pendingRestoreScrollTopRef.current;
	if (pendingScrollTop === null || !scrollContainer || layout.totalHeight <= size.height) {
		return false;
	}

	const restoredScrollTop            = clampNumber(
		pendingScrollTop,
		0,
		Math.max(
			0,
			layout.totalHeight - size.height,
		),
	);
	pendingRestoreScrollTopRef.current = null;
	scrollTopRef.current               = restoredScrollTop;
	scrollContainer.scrollTo({ top: restoredScrollTop });
	renderer.setScrollTop(restoredScrollTop);
	renderer.render();
	return true;
}

export function syncMediaWallSelectedIndexes<TItem>({
																											getItemSelected,
																											range,
																											renderer,
																										}: SyncMediaWallSelectedIndexesOptions<TItem>): void {
	renderer.setSelectedIndexes(getItemSelected
		? resolveSelectedIndexes(
			range,
			getItemSelected,
		)
		: new Set());
	renderer.render();
}
