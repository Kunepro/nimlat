// @vitest-environment jsdom
import type {
	ReactElement,
	RefObject,
} from "react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { usePixiMediaWallScrollRouting } from "./use-pixi-media-wall-scroll-routing";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

interface HookHostProps<T> {
	onValue: (value: T) => void;
	useHook: () => T;
}

let cleanupRenderedHooks: Array<() => void> = [];

function HookHost<T>({
											 onValue,
											 useHook,
										 }: HookHostProps<T>): ReactElement | null {
	onValue(useHook());
	return null;
}

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	flushSync(() => {
		root.render(createElement(
			HookHost<T>,
			{
				onValue: (value) => {
					currentValue = value;
				},
				useHook,
			},
		));
	});

	const unmount = () => {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}

				return currentValue;
			},
		},
		unmount,
	};
}

function createRef<TValue>(current: TValue): RefObject<TValue> {
	return { current } as RefObject<TValue>;
}

function createRenderer<TItem>(): MediaWallRenderer<TItem> {
	return {
		destroy:                  vi.fn(),
		getDiagnostics:           vi.fn(),
		mount:                    vi.fn(),
		render:                   vi.fn(),
		resize:                   vi.fn(),
		setActionTerminalState:   vi.fn(),
		setDiagnosticsEnabled:    vi.fn(),
		setExitingIndex:          vi.fn(),
		setFocusedIndex:          vi.fn(),
		setHoveredIndex:          vi.fn(),
		setItems:                 vi.fn(),
		setProjectorHoveredIndex: vi.fn(),
		setScrollTop:             vi.fn(),
		setSelectedIndex:         vi.fn(),
		setSelectedIndexes:       vi.fn(),
	} as unknown as MediaWallRenderer<TItem>;
}

function createRangeRef<TItem>(): RefObject<MediaWallLoadedRange<TItem>> {
	return createRef({
		offset: 0,
		total:  500,
		items:  [],
	});
}

function createLayout(): MediaWallLayout {
	return calculateMediaWallLayout({
		viewportWidth:  900,
		viewportHeight: 600,
		itemCount:      500,
	});
}

describe(
	"usePixiMediaWallScrollRouting",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
		});

		it(
			"syncs the visual scrollbar in the scroll event while keeping Pixi work RAF-batched",
			() => {
				const rafCallbacks: FrameRequestCallback[] = [];
				const requestAnimationFrame                = vi.fn((callback: FrameRequestCallback) => {
					rafCallbacks.push(callback);
					return rafCallbacks.length;
				});
				vi.stubGlobal(
					"requestAnimationFrame",
					requestAnimationFrame,
				);
				const container                   = document.createElement("div");
				const renderer                    = createRenderer<string>();
				const requestVisibleRange         = vi.fn();
				const syncVisualScrollbarPosition = vi.fn();
				const scrollTopRef                = createRef(0);
				const layoutRef                   = createRef<MediaWallLayout | null>(createLayout());
				const { result }                  = renderHook(() => usePixiMediaWallScrollRouting({
					activeIndexRef:              createRef<number | null>(null),
					layoutRef,
					pendingRestoreScrollTopRef:  createRef<number | null>(null),
					rangeRef:                    createRangeRef<string>(),
					renderer,
					requestVisibleRange,
					scrollContainerRef:          createRef(container),
					scrollMemoryKey:             "test-wall-scroll",
					scrollTopRef,
					sizeRef:                     createRef<MediaWallSize>({
						width:  900,
						height: 600,
					}),
					syncVisualScrollbarPosition,
					updateFocusedIndex:          vi.fn(),
					updateHoveredIndex:          vi.fn(),
					updateProjectorHoveredIndex: vi.fn(),
				}));

				container.scrollTop = 240;
				result.current();

				expect(scrollTopRef.current).toBe(240);
				expect(syncVisualScrollbarPosition).toHaveBeenCalledExactlyOnceWith(240);
				expect(requestAnimationFrame).toHaveBeenCalledOnce();
				expect(renderer.setScrollTop).not.toHaveBeenCalled();
				expect(renderer.render).not.toHaveBeenCalled();
				expect(requestVisibleRange).not.toHaveBeenCalled();

				rafCallbacks[ 0 ]?.(16);

				expect(renderer.setScrollTop).toHaveBeenCalledExactlyOnceWith(240);
				expect(renderer.render).toHaveBeenCalledOnce();
				expect(requestVisibleRange).toHaveBeenCalledExactlyOnceWith(240);
				expect(syncVisualScrollbarPosition).toHaveBeenCalledOnce();
			},
		);
	},
);
