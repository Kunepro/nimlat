// @vitest-environment node
import type { RefObject } from "react";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallSize,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import {
	type PixiMediaWallControllerRefs,
	syncPixiMediaWallControllerRefs,
} from "./use-pixi-media-wall-controller-refs";

function createRef<TValue>(current: TValue): RefObject<TValue> {
	return { current } as RefObject<TValue>;
}

function createControllerRefs<TItem>(): PixiMediaWallControllerRefs<TItem> {
	return {
		activeIndexRef:                createRef<number | null>(12),
		clearCardActionInteractionRef: createRef(() => undefined),
		getItemMenuActionsRef:         createRef<PixiMediaWallHostProps<TItem>["getItemMenuActions"]>(undefined),
		getItemSelectedRef:            createRef<PixiMediaWallHostProps<TItem>["getItemSelected"]>(undefined),
		layoutRef:                     createRef<MediaWallLayout | null>(null),
		onRangeLoadedRef:              createRef<PixiMediaWallHostProps<TItem>["onRangeLoaded"]>(undefined),
		onRangeLoadErrorRef:           createRef<PixiMediaWallHostProps<TItem>["onRangeLoadError"]>(undefined),
		pendingRestoreScrollTopRef:    createRef<number | null>(null),
		pixiLayerRef:                  createRef<HTMLDivElement | null>(null),
		rangeRef:                      createRef<MediaWallLoadedRange<TItem>>({
			offset: 0,
			total:  0,
			items:  [],
		}),
		scrollContainerRef:            createRef<HTMLDivElement | null>(null),
		scrollTopRef:                  createRef(20),
		sizeRef:                       createRef<MediaWallSize>({
			width:  1,
			height: 1,
		}),
	};
}

describe(
	"pixi media-wall controller refs",
	() => {
		it(
			"syncs latest callbacks and size without resetting structural refs",
			() => {
				const refs               = createControllerRefs<string>();
				const onRangeLoaded      = vi.fn();
				const onRangeLoadError   = vi.fn();
				const getItemSelected    = vi.fn(() => true);
				const getItemMenuActions = vi.fn(() => []);
				const activeIndexRef     = refs.activeIndexRef;
				const rangeRef           = refs.rangeRef;
				const scrollTopRef       = refs.scrollTopRef;

				syncPixiMediaWallControllerRefs(
					refs,
					{
						getItemMenuActions,
						getItemSelected,
						onRangeLoaded,
						onRangeLoadError,
						size: {
							width:  1280,
							height: 720,
						},
					},
				);

				expect(refs.onRangeLoadedRef.current).toBe(onRangeLoaded);
				expect(refs.onRangeLoadErrorRef.current).toBe(onRangeLoadError);
				expect(refs.getItemSelectedRef.current).toBe(getItemSelected);
				expect(refs.getItemMenuActionsRef.current).toBe(getItemMenuActions);
				expect(refs.sizeRef.current).toEqual({
					width:  1280,
					height: 720,
				});
				expect(refs.activeIndexRef).toBe(activeIndexRef);
				expect(refs.rangeRef).toBe(rangeRef);
				expect(refs.scrollTopRef).toBe(scrollTopRef);
				expect(refs.scrollTopRef.current).toBe(20);
			},
		);
	},
);
