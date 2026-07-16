// @vitest-environment jsdom
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useTrackingStatusPopoverState } from "./useTrackingStatusPopoverState";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
const originalViewport                      = {
	height: window.innerHeight,
	width:  window.innerWidth,
};

function setViewport(width: number, height: number): void {
	Object.defineProperty(
		window,
		"innerWidth",
		{
			configurable: true,
			value:        width,
		},
	);
	Object.defineProperty(
		window,
		"innerHeight",
		{
			configurable: true,
			value:        height,
		},
	);
}

function createAnchor(rect: Pick<DOMRect, "height" | "right" | "top">): HTMLButtonElement {
	const button                 = document.createElement("button");
	button.getBoundingClientRect = vi.fn(() => rect as DOMRect);
	return button;
}

function attachAnchor(
	trapRef: { current: HTMLButtonElement | null },
	rect: Pick<DOMRect, "height" | "right" | "top">,
): void {
	trapRef.current = createAnchor(rect);
}

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
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

describe(
	"useTrackingStatusPopoverState",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
			setViewport(
				800,
				600,
			);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			setViewport(
				originalViewport.width,
				originalViewport.height,
			);
			vi.useRealTimers();
		});

		it(
			"opens with geometry-based vertical placement and notifies consumers",
			() => {
				const onOpenChange = vi.fn();
				const { result }   = renderHook(() => useTrackingStatusPopoverState({
					autoVerticalPlacement: true,
					onOpenChange,
					variant:               "default",
				}));
				attachAnchor(
					result.current.trapRef,
					{
						height: 24,
						right:  140,
						top:    80,
					},
				);

				flushSync(() => {
					result.current.updateOpen(true);
				});

				expect(result.current.isOpen).toBe(true);
				expect(result.current.resolvedPlacement).toBe("bottom");
				expect(onOpenChange).toHaveBeenCalledWith(true);

				flushSync(() => {
					result.current.updateOpen(false);
				});

				expect(result.current.isOpen).toBe(false);
				expect(onOpenChange).toHaveBeenLastCalledWith(false);
			},
		);

		it(
			"computes inline overlay position from trigger geometry",
			() => {
				const { result } = renderHook(() => useTrackingStatusPopoverState({
					autoVerticalPlacement: false,
					variant:               "inlineProjectorOverlay",
				}));
				attachAnchor(
					result.current.trapRef,
					{
						height: 40,
						right:  100,
						top:    120,
					},
				);

				flushSync(() => {
					result.current.updateOpen(true);
				});

				expect(result.current.inlineOverlayPosition).toEqual({
					left: 122,
					top:  25,
				});
			},
		);

		it(
			"closes inline projector overlays after the hover grace window",
			() => {
				const onOpenChange = vi.fn();
				const { result }   = renderHook(() => useTrackingStatusPopoverState({
					autoVerticalPlacement: false,
					onOpenChange,
					variant:               "inlineProjectorOverlay",
				}));
				attachAnchor(
					result.current.trapRef,
					{
						height: 40,
						right:  100,
						top:    120,
					},
				);

				flushSync(() => {
					result.current.updateOpen(true);
					result.current.closeInlineProjectorSoon();
					vi.advanceTimersByTime(139);
				});

				expect(result.current.isOpen).toBe(true);

				flushSync(() => {
					vi.advanceTimersByTime(1);
				});

				expect(result.current.isOpen).toBe(false);
				expect(onOpenChange).toHaveBeenLastCalledWith(false);
			},
		);

		it(
			"mirrors an open popover as closed during cleanup",
			() => {
				const onOpenChange = vi.fn();
				const {
								result,
								unmount,
							}            = renderHook(() => useTrackingStatusPopoverState({
					autoVerticalPlacement: false,
					onOpenChange,
					variant:               "default",
				}));

				flushSync(() => {
					result.current.updateOpen(true);
				});

				unmount();

				expect(onOpenChange).toHaveBeenLastCalledWith(false);
			},
		);
	},
);
