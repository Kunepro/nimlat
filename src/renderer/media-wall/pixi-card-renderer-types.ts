import type { MediaWallTerminalState } from "../types/media-wall";

export interface PixiCardRenderState {
	hovered: boolean;
	projectorHovered: boolean;
	actionMenuOpen: boolean;
	exitingStartedAtMs: number | null;
	selected: boolean;
	focused: boolean;
	placeholder: boolean;
	effectsEnabled: boolean;
	itemSelected: boolean;
	terminalState: MediaWallTerminalState | null;
}

export interface PixiCardPosterBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}
