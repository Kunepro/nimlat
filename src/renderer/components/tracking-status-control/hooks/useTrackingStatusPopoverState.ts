import type { PopoverProps } from "antd/es/popover";
import type { RefObject } from "react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type {
	InlineProjectorOverlayPosition,
	TrackingStatusControlVariant,
} from "../tracking-status-control-model";
import {
	resolveAutoVerticalPlacement,
	resolveInlineProjectorOverlayPosition,
} from "../tracking-status-control-model";

interface UseTrackingStatusPopoverStateInput {
	autoVerticalPlacement: boolean;
	onOpenChange?: (open: boolean) => void;
	placement?: PopoverProps["placement"];
	variant: TrackingStatusControlVariant;
}

interface TrackingStatusPopoverState {
	closeInlineProjectorSoon: () => void;
	inlineOverlayPosition: InlineProjectorOverlayPosition | null;
	isOpen: boolean;
	resolvedPlacement: PopoverProps["placement"];
	trapRef: RefObject<HTMLButtonElement | null>;
	updateOpen: (nextOpen: boolean) => void;
}

// Isolates popover lifecycle from the visual tracking-status control variants:
// placement is derived from the trigger geometry, while cleanup always mirrors
// the last open state back to consumers.
export function useTrackingStatusPopoverState({
																								autoVerticalPlacement,
																								onOpenChange,
																								placement,
																								variant,
																							}: UseTrackingStatusPopoverStateInput): TrackingStatusPopoverState {
	const [ isOpen, setIsOpen ]                               = useState(false);
	const [ resolvedPlacement, setPlacement ]                 = useState<PopoverProps["placement"]>(placement);
	const [ inlineOverlayPosition, setInlineOverlayPosition ] = useState<InlineProjectorOverlayPosition | null>(null);
	const trapRef                                             = useRef<HTMLButtonElement>(null);
	const isOpenRef                                           = useRef(false);
	const onOpenChangeRef                                     = useRef(onOpenChange);
	const closeTimeoutRef                                     = useRef<number | null>(null);

	useEffect(
		() => {
			onOpenChangeRef.current = onOpenChange;
		},
		[ onOpenChange ],
	);

	useEffect(
		() => () => {
			if (closeTimeoutRef.current != null) {
				window.clearTimeout(closeTimeoutRef.current);
			}
			if (isOpenRef.current) {
				onOpenChangeRef.current?.(false);
			}
		},
		[],
	);

	const updateOpen = useCallback(
		(nextOpen: boolean) => {
			if (closeTimeoutRef.current != null) {
				window.clearTimeout(closeTimeoutRef.current);
				closeTimeoutRef.current = null;
			}

			if (nextOpen && autoVerticalPlacement && !placement) {
				setPlacement(resolveAutoVerticalPlacement(
					trapRef.current?.getBoundingClientRect(),
					window.innerHeight,
				));
			}

			if (nextOpen && variant === "inlineProjectorOverlay") {
				setInlineOverlayPosition(resolveInlineProjectorOverlayPosition(
					trapRef.current?.getBoundingClientRect(),
					{
						height: window.innerHeight,
						width:  window.innerWidth,
					},
				));
			}

			isOpenRef.current = nextOpen;
			setIsOpen(nextOpen);
			onOpenChangeRef.current?.(nextOpen);
		},
		[
			autoVerticalPlacement,
			placement,
			variant,
		],
	);

	const closeInlineProjectorSoon = useCallback(
		() => {
			if (variant !== "inlineProjectorOverlay") {
				return;
			}
			if (closeTimeoutRef.current != null) {
				window.clearTimeout(closeTimeoutRef.current);
			}
			closeTimeoutRef.current = window.setTimeout(
				() => updateOpen(false),
				140,
			);
		},
		[
			updateOpen,
			variant,
		],
	);

	return {
		closeInlineProjectorSoon,
		inlineOverlayPosition,
		isOpen,
		resolvedPlacement,
		trapRef,
		updateOpen,
	};
}
