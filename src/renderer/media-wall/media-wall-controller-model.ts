import type {
	MediaWallLayout,
	MediaWallLoadedRange,
} from "../types/media-wall";
import { getRangeItem } from "./media-wall-host.utils";

interface ResolveActiveMediaWallIndexInput {
	actionMenuOpenIndex: number | null;
	focusedIndex: number | null;
	hoveredIndex: number | null;
	selectedIndex: number | null;
}

interface ResolveActiveMediaWallAriaLabelInput<TItem> {
	activeIndex: number | null;
	getItemAriaLabel?: (item: TItem) => string;
	rangeState: MediaWallLoadedRange<TItem>;
}

export function resolveActiveMediaWallIndex({
																							actionMenuOpenIndex,
																							focusedIndex,
																							hoveredIndex,
																							selectedIndex,
																						}: ResolveActiveMediaWallIndexInput): number | null {
	return actionMenuOpenIndex ?? hoveredIndex ?? focusedIndex ?? selectedIndex;
}

export function resolveActiveMediaWallAriaLabel<TItem>({
																												 activeIndex,
																												 getItemAriaLabel,
																												 rangeState,
																											 }: ResolveActiveMediaWallAriaLabelInput<TItem>): string {
	if (activeIndex === null || !getItemAriaLabel) {
		return "";
	}

	const activeItem = getRangeItem(
		rangeState,
		activeIndex,
	);

	return activeItem ? getItemAriaLabel(activeItem) : "";
}

export function resolveMediaWallSpacerHeight(
	layout: MediaWallLayout,
	viewportHeight: number,
): number {
	return Math.max(
		0,
		layout.totalHeight - viewportHeight,
	);
}
