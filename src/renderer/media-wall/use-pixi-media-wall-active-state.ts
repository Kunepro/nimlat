import type { RefObject } from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import {
	resolveActiveMediaWallAriaLabel,
	resolveActiveMediaWallIndex,
	resolveMediaWallSpacerHeight,
} from "./media-wall-controller-model";

interface CreatePixiMediaWallActiveStateInput<TItem> {
	actionMenuOpenIndex: number | null;
	focusedIndex: number | null;
	getItemAriaLabel: PixiMediaWallHostProps<TItem>["getItemAriaLabel"];
	hoveredIndex: number | null;
	layout: MediaWallLayout;
	rangeState: MediaWallLoadedRange<TItem>;
	selectedIndex: number | null;
	viewportHeight: number;
}

interface UsePixiMediaWallActiveStateInput<TItem> extends CreatePixiMediaWallActiveStateInput<TItem> {
	activeIndexRef: RefObject<number | null>;
}

export interface PixiMediaWallActiveState {
	activeAriaLabel: string;
	activeIndex: number | null;
	spacerHeight: number;
}

export function createPixiMediaWallActiveState<TItem>({
																												actionMenuOpenIndex,
																												focusedIndex,
																												getItemAriaLabel,
																												hoveredIndex,
																												layout,
																												rangeState,
																												selectedIndex,
																												viewportHeight,
																											}: CreatePixiMediaWallActiveStateInput<TItem>): PixiMediaWallActiveState {
	const activeIndex = resolveActiveMediaWallIndex({
		actionMenuOpenIndex,
		focusedIndex,
		hoveredIndex,
		selectedIndex,
	});

	return {
		activeAriaLabel: resolveActiveMediaWallAriaLabel({
			activeIndex,
			getItemAriaLabel,
			rangeState,
		}),
		activeIndex,
		spacerHeight:    resolveMediaWallSpacerHeight(
			layout,
			viewportHeight,
		),
	};
}

export function usePixiMediaWallActiveState<TItem>({
																										 activeIndexRef,
																										 ...input
																									 }: UsePixiMediaWallActiveStateInput<TItem>): PixiMediaWallActiveState {
	const activeState = createPixiMediaWallActiveState(input);

	// Scroll routing reads this ref synchronously while DOM scroll events are
	// dispatched, so keep it in lockstep with the view model active index.
	activeIndexRef.current = activeState.activeIndex;

	return activeState;
}
