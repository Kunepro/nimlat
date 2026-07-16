import type {
	MediaWallLayout,
	MediaWallTerminalAction,
} from "../types/media-wall";
import { clampNumber } from "./media-wall-host.utils";
import {
	getMediaWallItemViewportPosition,
	hitTestMediaWall,
} from "./media-wall-layout";
import {
	TERMINAL_ACTION_ROW_HEIGHT,
	TERMINAL_ACTION_START_Y,
	TERMINAL_CONFIRM_CHOICE_Y,
} from "./pixi-card-terminal-model";

const CARD_POSTER_LEFT                     = 12;
const CARD_POSTER_TOP                      = 12;
const CARD_POSTER_BOTTOM_RESERVE           = 112;
const PROJECTOR_HIT_WIDTH                  = 68;
const PROJECTOR_HIT_HEIGHT                 = 34;
const PROJECTOR_HIT_BOTTOM_OFFSET          = 9;
const SELECTION_PLAQUE_HIT_WIDTH           = 56;
const SELECTION_PLAQUE_HIT_HEIGHT          = 18;
const SELECTION_PLAQUE_RIGHT               = 76;
const ACTION_BUTTON_SIZE                   = 24;
const ACTION_BUTTON_INSET                  = 2;
const TERMINAL_CONFIRM_HEIGHT              = 26;
const TERMINAL_CONFIRM_YES_WIDTH           = 34;
const TERMINAL_CONFIRM_NO_LEFT             = 58;
const WATCH_PLAQUE_HIT_WIDTH               = 20;
const WATCH_PLAQUE_HIT_HEIGHT              = 42;
const WATCH_PLAQUE_BOTTOM_OFFSET           = 78;
export const PROJECTOR_TRACKING_MENU_WIDTH = 760;
const PROJECTOR_TRACKING_MENU_MARGIN       = 12;

function isPointInsideProjector(localX: number, localY: number, cardWidth: number, cardHeight: number): boolean {
	const projectorLeft = (cardWidth - PROJECTOR_HIT_WIDTH) / 2;
	const projectorTop  = cardHeight - PROJECTOR_HIT_BOTTOM_OFFSET - PROJECTOR_HIT_HEIGHT;
	return localX >= projectorLeft
		&& localX <= projectorLeft + PROJECTOR_HIT_WIDTH
		&& localY >= projectorTop
		&& localY <= projectorTop + PROJECTOR_HIT_HEIGHT;
}

export function isPointInsideSelectionPlaque(localX: number, localY: number, cardWidth: number): boolean {
	const plaqueLeft = Math.max(
		16,
		cardWidth - SELECTION_PLAQUE_RIGHT,
	);
	return localX >= plaqueLeft
		&& localX <= plaqueLeft + SELECTION_PLAQUE_HIT_WIDTH
		&& localY >= 0
		&& localY <= SELECTION_PLAQUE_HIT_HEIGHT;
}

export function isPointInsideWatchedPlaque(localX: number, localY: number, cardHeight: number): boolean {
	const plaqueTop = Math.max(
		24,
		cardHeight - WATCH_PLAQUE_BOTTOM_OFFSET,
	);
	return localX >= 0
		&& localX <= WATCH_PLAQUE_HIT_WIDTH
		&& localY >= plaqueTop
		&& localY <= plaqueTop + WATCH_PLAQUE_HIT_HEIGHT;
}

export function isPointInsideActionMenuButton(localX: number, localY: number, cardWidth: number): boolean {
	const buttonLeft = cardWidth - CARD_POSTER_LEFT - ACTION_BUTTON_INSET - ACTION_BUTTON_SIZE;
	const buttonTop  = CARD_POSTER_TOP + ACTION_BUTTON_INSET;
	return localX >= buttonLeft
		&& localX <= buttonLeft + ACTION_BUTTON_SIZE
		&& localY >= buttonTop
		&& localY <= buttonTop + ACTION_BUTTON_SIZE;
}

export function getTerminalActionAtPoint(
	actions: readonly MediaWallTerminalAction[],
	localX: number,
	localY: number,
	cardWidth: number,
	cardHeight: number,
): MediaWallTerminalAction | null {
	const posterWidth  = cardWidth - (CARD_POSTER_LEFT * 2);
	const posterHeight = Math.max(
		40,
		cardHeight - CARD_POSTER_BOTTOM_RESERVE,
	);
	if (
		localX < CARD_POSTER_LEFT
		|| localX > CARD_POSTER_LEFT + posterWidth
		|| localY < CARD_POSTER_TOP
		|| localY > CARD_POSTER_TOP + posterHeight
	) {
		return null;
	}
	const rowIndex = Math.floor((localY - CARD_POSTER_TOP - TERMINAL_ACTION_START_Y) / TERMINAL_ACTION_ROW_HEIGHT);
	const action   = actions[ rowIndex ];
	return action && !action.disabled && !action.loading
		? action
		: null;
}

export function getTerminalConfirmChoiceAtPoint(
	localX: number,
	localY: number,
	cardWidth: number,
	cardHeight: number,
): "yes" | "no" | null {
	const posterWidth  = cardWidth - (CARD_POSTER_LEFT * 2);
	const posterHeight = Math.max(
		40,
		cardHeight - CARD_POSTER_BOTTOM_RESERVE,
	);
	if (
		localX < CARD_POSTER_LEFT
		|| localX > CARD_POSTER_LEFT + posterWidth
		|| localY < CARD_POSTER_TOP
		|| localY > CARD_POSTER_TOP + posterHeight
	) {
		return null;
	}
	const terminalX = localX - CARD_POSTER_LEFT;
	const terminalY = localY - CARD_POSTER_TOP;
	if (terminalY < TERMINAL_CONFIRM_CHOICE_Y || terminalY > TERMINAL_CONFIRM_CHOICE_Y + TERMINAL_CONFIRM_HEIGHT) {
		return null;
	}
	if (terminalX >= 12 && terminalX <= 12 + TERMINAL_CONFIRM_YES_WIDTH) {
		return "yes";
	}
	if (terminalX >= TERMINAL_CONFIRM_NO_LEFT && terminalX <= TERMINAL_CONFIRM_NO_LEFT + 28) {
		return "no";
	}
	return null;
}

export function getProjectorHoveredIndex(layout: MediaWallLayout, point: {
	x: number;
	y: number
}, scrollTop: number): number | null {
	const index = hitTestMediaWall(
		layout,
		point,
		scrollTop,
	);
	if (index === null) {
		return null;
	}
	const position = getMediaWallItemViewportPosition(
		layout,
		index,
		scrollTop,
	);
	if (!position) {
		return null;
	}
	const localX = point.x - position.x;
	const localY = point.y - position.y;

	if (isPointInsideProjector(
		localX,
		localY,
		position.width,
		position.height,
	)) {
		return index;
	}

	return null;
}

export function getProjectorTrackingMenuOffset(position: {
	x: number;
	width: number;
}, viewportWidth: number): number {
	const centerX     = position.x + (position.width / 2);
	const maxLeft     = Math.max(
		PROJECTOR_TRACKING_MENU_MARGIN,
		viewportWidth - PROJECTOR_TRACKING_MENU_WIDTH - PROJECTOR_TRACKING_MENU_MARGIN,
	);
	const clampedLeft = clampNumber(
		centerX - (PROJECTOR_TRACKING_MENU_WIDTH / 2),
		PROJECTOR_TRACKING_MENU_MARGIN,
		maxLeft,
	);
	return Math.round(clampedLeft - centerX);
}
