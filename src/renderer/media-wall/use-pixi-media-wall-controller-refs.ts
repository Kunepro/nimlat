import {
	type RefObject,
	useMemo,
	useRef,
} from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallSize,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import { createEmptyRange } from "./media-wall-host.utils";

export interface PixiMediaWallControllerLatestValues<TItem> {
	getItemMenuActions: PixiMediaWallHostProps<TItem>["getItemMenuActions"];
	getItemSelected: PixiMediaWallHostProps<TItem>["getItemSelected"];
	onRangeLoaded: PixiMediaWallHostProps<TItem>["onRangeLoaded"];
	onRangeLoadError: PixiMediaWallHostProps<TItem>["onRangeLoadError"];
	size: MediaWallSize;
}

export interface PixiMediaWallControllerRefs<TItem> {
	activeIndexRef: RefObject<number | null>;
	clearCardActionInteractionRef: RefObject<() => void>;
	getItemMenuActionsRef: RefObject<PixiMediaWallHostProps<TItem>["getItemMenuActions"]>;
	getItemSelectedRef: RefObject<PixiMediaWallHostProps<TItem>["getItemSelected"]>;
	layoutRef: RefObject<MediaWallLayout | null>;
	onRangeLoadedRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoaded"]>;
	onRangeLoadErrorRef: RefObject<PixiMediaWallHostProps<TItem>["onRangeLoadError"]>;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	pixiLayerRef: RefObject<HTMLDivElement | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollTopRef: RefObject<number>;
	sizeRef: RefObject<MediaWallSize>;
}

// Async range loading and event routing need current callbacks without recreating
// subscription-heavy handlers on every render. Keep the latest mutable values in
// one documented place so stale-closure fixes are not scattered through the controller.
export function syncPixiMediaWallControllerRefs<TItem>(
	refs: PixiMediaWallControllerRefs<TItem>,
	latest: PixiMediaWallControllerLatestValues<TItem>,
): void {
	refs.onRangeLoadedRef.current      = latest.onRangeLoaded;
	refs.onRangeLoadErrorRef.current   = latest.onRangeLoadError;
	refs.getItemSelectedRef.current    = latest.getItemSelected;
	refs.getItemMenuActionsRef.current = latest.getItemMenuActions;
	refs.sizeRef.current               = latest.size;
}

export function usePixiMediaWallControllerRefs<TItem>(
	latest: PixiMediaWallControllerLatestValues<TItem>,
): PixiMediaWallControllerRefs<TItem> {
	const scrollContainerRef            = useRef<HTMLDivElement | null>(null);
	const pixiLayerRef                  = useRef<HTMLDivElement | null>(null);
	const sizeRef                       = useRef<MediaWallSize>({
		width:  1,
		height: 1,
	});
	const rangeRef                      = useRef<MediaWallLoadedRange<TItem>>(createEmptyRange<TItem>());
	const layoutRef                     = useRef<MediaWallLayout | null>(null);
	const scrollTopRef                  = useRef(0);
	const pendingRestoreScrollTopRef    = useRef<number | null>(null);
	const activeIndexRef                = useRef<number | null>(null);
	const onRangeLoadedRef              = useRef(latest.onRangeLoaded);
	const onRangeLoadErrorRef           = useRef(latest.onRangeLoadError);
	const getItemSelectedRef            = useRef(latest.getItemSelected);
	const getItemMenuActionsRef         = useRef(latest.getItemMenuActions);
	const clearCardActionInteractionRef = useRef<() => void>(() => undefined);

	const refs = useMemo<PixiMediaWallControllerRefs<TItem>>(
		() => ({
			activeIndexRef,
			clearCardActionInteractionRef,
			getItemMenuActionsRef,
			getItemSelectedRef,
			layoutRef,
			onRangeLoadedRef,
			onRangeLoadErrorRef,
			pendingRestoreScrollTopRef,
			pixiLayerRef,
			rangeRef,
			scrollContainerRef,
			scrollTopRef,
			sizeRef,
		}),
		[
			activeIndexRef,
			clearCardActionInteractionRef,
			getItemMenuActionsRef,
			getItemSelectedRef,
			layoutRef,
			onRangeLoadedRef,
			onRangeLoadErrorRef,
			pendingRestoreScrollTopRef,
			pixiLayerRef,
			rangeRef,
			scrollContainerRef,
			scrollTopRef,
			sizeRef,
		],
	);

	syncPixiMediaWallControllerRefs(
		refs,
		latest,
	);

	return refs;
}
