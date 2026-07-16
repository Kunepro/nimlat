import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import { useLayoutEffect } from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";

interface UsePixiMediaWallRendererLifecycleProps<TItem> {
	layout: MediaWallLayout;
	layoutRef: RefObject<MediaWallLayout | null>;
	onRangeLoadErrorRef: RefObject<((error: unknown) => void) | undefined>;
	pixiLayerRef: RefObject<HTMLDivElement | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollTopRef: RefObject<number>;
	setSize: Dispatch<SetStateAction<MediaWallSize>>;
	size: MediaWallSize;
	sizeRef: RefObject<MediaWallSize>;
}

export function usePixiMediaWallRendererLifecycle<TItem>({
																													 layout,
																													 layoutRef,
																													 onRangeLoadErrorRef,
																													 pixiLayerRef,
																													 rangeRef,
																													 renderer,
																													 scrollContainerRef,
																													 scrollTopRef,
																													 setSize,
																													 size,
																													 sizeRef,
																												 }: UsePixiMediaWallRendererLifecycleProps<TItem>) {
	useLayoutEffect(
		() => {
			layoutRef.current = layout;
			renderer.resize(size);
			renderer.render();
		},
		[
			layout,
			layoutRef,
			renderer,
			size,
		],
	);

	useLayoutEffect(
		() => {
			const container = pixiLayerRef.current;
			if (!container) {
				return undefined;
			}

			let cancelled = false;
			void renderer.mount(container)
				.then(() => {
					if (cancelled) {
						return;
					}
					// Pixi initializes asynchronously; replay the current host state after mount so an
					// early size/range effect is not lost as a no-op before the renderer exists.
					renderer.resize(sizeRef.current);
					renderer.setItems(rangeRef.current);
					renderer.setScrollTop(scrollTopRef.current);
					renderer.render();
				})
				.catch((error: unknown) => {
					if (!cancelled) {
						onRangeLoadErrorRef.current?.(error);
					}
				});
			return () => {
				cancelled = true;
				renderer.destroy();
			};
		},
		[
			onRangeLoadErrorRef,
			pixiLayerRef,
			rangeRef,
			renderer,
			scrollTopRef,
			sizeRef,
		],
	);

	useLayoutEffect(
		() => {
			const scrollContainer = scrollContainerRef.current;
			const pixiLayer       = pixiLayerRef.current;
			if (!scrollContainer || !pixiLayer) {
				return undefined;
			}

			const updateSize = () => {
				const nextSize = {
					width:  Math.max(
						1,
						Math.floor(pixiLayer.clientWidth),
					),
					height: Math.max(
						1,
						Math.floor(scrollContainer.clientHeight),
					),
				};
				setSize((currentSize) => currentSize.width === nextSize.width && currentSize.height === nextSize.height
					? currentSize
					: nextSize);
			};

			const resizeObserver = new ResizeObserver(updateSize);
			resizeObserver.observe(scrollContainer);
			resizeObserver.observe(pixiLayer);
			updateSize();
			return () => {
				resizeObserver.disconnect();
			};
		},
		[
			pixiLayerRef,
			scrollContainerRef,
			setSize,
		],
	);
}
