import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";
import {
	calculateMediaWallLayout,
	calculateMediaWallVisibleRange,
} from "./media-wall-layout";

const SCROLL_MEMORY_MAX_ENTRIES = 32;
const RANGE_PREFETCH_VIEWPORTS_PER_SIDE = 12;

export const MEDIA_WALL_MAX_REQUEST_ITEMS = 512;

const mediaWallScrollMemory = new Map<string, number>();

export function createEmptyRange<TItem>(): MediaWallLoadedRange<TItem> {
	return {
		offset: 0,
		total:  0,
		items:  [],
	};
}

export function isRangeCovered<TItem>(range: MediaWallLoadedRange<TItem>, firstIndex: number, lastIndexExclusive: number): boolean {
	return range.offset <= firstIndex && range.offset + range.items.length >= lastIndexExclusive;
}

export function getRangeItem<TItem>(range: MediaWallLoadedRange<TItem>, index: number): TItem | null {
	const localIndex = index - range.offset;
	return localIndex >= 0 && localIndex < range.items.length
		? range.items[ localIndex ] ?? null
		: null;
}

export function resolveSelectedIndexes<TItem>(range: MediaWallLoadedRange<TItem>, getItemSelected: (item: TItem) => boolean): Set<number> {
	const selectedIndexes = new Set<number>();
	range.items.forEach((item, localIndex) => {
		if (getItemSelected(item)) {
			selectedIndexes.add(range.offset + localIndex);
		}
	});
	return selectedIndexes;
}

export function clampIndex(index: number, total: number): number | null {
	if (total <= 0) {
		return null;
	}
	return Math.min(
		Math.max(
			index,
			0,
		),
		total - 1,
	);
}

export function clampNumber(value: number, min: number, max: number): number {
	return Math.min(
		Math.max(
			value,
			min,
		),
		max,
	);
}

export function resolveRequestedRange(layout: MediaWallLayout, scrollTop: number, maximumRequestItems: number): {
	offset: number;
	limit: number;
} {
	const normalizedMaximum = Math.max(
		1,
		Math.floor(maximumRequestItems),
	);
	if (layout.itemCount <= 0) {
		return {
			offset: 0,
			limit:  normalizedMaximum,
		};
	}

	const visibleRange = calculateMediaWallVisibleRange(
		layout,
		scrollTop,
	);
	const viewportRange = calculateMediaWallVisibleRange(
		layout,
		scrollTop,
		0,
	);
	const visibleCount = Math.max(
		0,
		visibleRange.lastIndexExclusive - visibleRange.firstIndex,
	);
	const viewportCount = Math.max(
		layout.columns,
		viewportRange.lastIndexExclusive - viewportRange.firstIndex,
	);
	// Express scroll headroom in viewport-sized units instead of a fixed item
	// count. Dense or tall canvases receive more data, while the hard cap keeps
	// renderer memory and IPC payloads bounded independently of catalog size.
	const adaptiveLimit = visibleCount + (viewportCount * RANGE_PREFETCH_VIEWPORTS_PER_SIDE * 2);
	const limit         = Math.min(
		layout.itemCount,
		Math.max(
			visibleCount,
			Math.min(
				normalizedMaximum,
				adaptiveLimit,
			),
		),
	);
	const bufferBefore = Math.floor(Math.max(
		0,
		limit - visibleCount,
	) / 2);
	// Keep the overscanned viewport near the middle of a bounded range. This gives
	// scrolling in either direction headroom without growing renderer memory over time.
	const centeredOffset = Math.max(
		0,
		visibleRange.firstIndex - bufferBefore,
	);
	return {
		offset: Math.min(
			centeredOffset,
			Math.max(
				0,
				layout.itemCount - limit,
			),
		),
		limit,
	};
}

export function createScrollMemoryKey(dataKey: string, search: string): string {
	return `${ dataKey }\u0000${ search }`;
}

export function readRememberedScrollTop(memoryKey: string): number {
	return mediaWallScrollMemory.get(memoryKey) ?? 0;
}

export function rememberScrollTop(memoryKey: string, scrollTop: number): void {
	mediaWallScrollMemory.delete(memoryKey);
	mediaWallScrollMemory.set(
		memoryKey,
		scrollTop,
	);
	if (mediaWallScrollMemory.size <= SCROLL_MEMORY_MAX_ENTRIES) {
		return;
	}
	const oldestKey = mediaWallScrollMemory.keys().next().value;
	if (typeof oldestKey === "string") {
		mediaWallScrollMemory.delete(oldestKey);
	}
}

export function resolveInitialRequest(size: MediaWallSize, scrollTop: number, maximumRequestItems: number): {
	offset: number;
	limit: number;
} {
	// The first restored request does not know the total yet, but row geometry only depends on viewport size.
	// A large synthetic count lets the wall size the initial page from the viewport
	// and ask for a remembered position instead of flashing from row zero.
	return resolveRequestedRange(
		calculateMediaWallLayout({
			viewportWidth:  size.width,
			viewportHeight: size.height,
			itemCount:      1_000_000,
		}),
		scrollTop,
		maximumRequestItems,
	);
}

export function getVisualScrollbarThumbHeight(layout: MediaWallLayout, size: MediaWallSize): number {
	return Math.max(
		40,
		(size.height / Math.max(
			1,
			layout.totalHeight,
		)) * size.height,
	);
}

export function getVisualScrollbarThumbTop(layout: MediaWallLayout, size: MediaWallSize, scrollTop: number): number {
	const thumbHeight = getVisualScrollbarThumbHeight(
		layout,
		size,
	);
	return Math.min(
		size.height - thumbHeight,
		(scrollTop / Math.max(
			1,
			layout.totalHeight - size.height,
		)) * (size.height - thumbHeight),
	);
}

export function updateVisualScrollbarPosition(
	scrollTop: number,
	layout: MediaWallLayout | null,
	size: MediaWallSize,
	rail: HTMLDivElement | null,
	thumb: HTMLDivElement | null,
): void {
	if (!layout || !rail || !thumb || layout.totalHeight <= size.height) {
		return;
	}
	// The rail is a fixed sibling of the scroll owner; only the thumb represents
	// scroll progress. Clearing any stale transform prevents old scroll-compensation
	// styles from making the rail move with the content after hot updates.
	rail.style.transform = "";
	thumb.style.transform = `translateY(${ getVisualScrollbarThumbTop(
		layout,
		size,
		scrollTop,
	) }px)`;
}

export function schedulePostRangePaintRender<TItem>(
	renderer: MediaWallRenderer<TItem>,
	rafRef: { current: number | null },
): void {
	if (typeof requestAnimationFrame !== "function") {
		renderer.render();
		return;
	}
	if (rafRef.current !== null) {
		cancelAnimationFrame(rafRef.current);
	}
	// Some route views remove a loading overlay and settle measured layout in the same tick as
	// range delivery. Replaying after the next paint keeps the initial texture binding path
	// identical to the later hover/scroll render path.
	rafRef.current = requestAnimationFrame(() => {
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			renderer.render();
		});
	});
}
