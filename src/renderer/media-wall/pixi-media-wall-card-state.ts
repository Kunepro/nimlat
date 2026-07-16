import type { MediaWallTerminalState } from "../types/media-wall";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";

export type PixiMediaWallExitingCardTarget = {
	index: number;
	itemId: string;
	startedAtMs: number;
};

type PixiMediaWallCardRenderStateInput = {
	globalIndex: number;
	itemPresent: boolean;
	mappedItemId: string | null;
	hoveredIndex: number | null;
	projectorHoveredIndex: number | null;
	selectedIndex: number | null;
	selectedIndexes: ReadonlySet<number>;
	focusedIndex: number | null;
	actionTerminalState: MediaWallTerminalState | null;
	exitingCardTarget: PixiMediaWallExitingCardTarget | null;
};

export function createPixiMediaWallCardRenderState({
																										 globalIndex,
																										 itemPresent,
																										 mappedItemId,
																										 hoveredIndex,
																										 projectorHoveredIndex,
																										 selectedIndex,
																										 selectedIndexes,
																										 focusedIndex,
																										 actionTerminalState,
																										 exitingCardTarget,
																									 }: PixiMediaWallCardRenderStateInput): PixiCardRenderState {
	const terminalState      = actionTerminalState?.index === globalIndex
		? actionTerminalState
		: null;
	const isItemSelected     = selectedIndexes.has(globalIndex);
	const exitingStartedAtMs = exitingCardTarget
	&& exitingCardTarget.index === globalIndex
	&& mappedItemId === exitingCardTarget.itemId
		? exitingCardTarget.startedAtMs
		: null;

	return {
		hovered:          hoveredIndex === globalIndex,
		projectorHovered: projectorHoveredIndex === globalIndex,
		actionMenuOpen:   terminalState !== null,
		exitingStartedAtMs,
		terminalState,
		selected:         selectedIndex === globalIndex || isItemSelected,
		itemSelected:     isItemSelected,
		focused:          focusedIndex === globalIndex,
		placeholder:      !itemPresent,
		effectsEnabled:   true,
	};
}
