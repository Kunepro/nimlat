import type { MediaWallTerminalState } from "../types/media-wall";
import {
	getCardExitAnimation,
	getNeonTurnOnIntensity,
	isNeonTargetLit,
} from "./pixi-card-animation";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";
import {
	getTerminalStateKey,
	TERMINAL_TRANSITION_MS,
	TERMINAL_TYPEWRITER_MS_PER_CHAR,
} from "./pixi-card-terminal-model";

export type PixiCardBoundSnapshot = {
	actionMenuTransitionStartedAt: number | null;
	boundHeight: number;
	boundKey: string | null;
	boundState: PixiCardRenderState | null;
	boundTextureUid: number | null;
	boundWatched: boolean | null;
	boundWidth: number;
	neonTurnOnStartedAt: number | null;
};

export type PixiCardBindDecision = {
	actionMenuAnimating: boolean;
	actionMenuSettling: boolean;
	actionMenuTransitionStartedAt: number | null;
	exitAnimation: {
		alpha: number;
		animating: boolean;
		offsetY: number;
	};
	hasActiveAnimation: boolean;
	isWatched: boolean;
	itemChanged: boolean;
	neonIntensity: number;
	neonTurnOnStartedAt: number | null;
	shouldUpdateGraphics: boolean;
	shouldUpdateText: boolean;
	shouldUpdateThumbnail: boolean;
	sizeChanged: boolean;
	textureChanged: boolean;
};

type PixiCardBindDecisionInput = {
	isWatched: boolean;
	itemKey: string;
	nowMs: number;
	positionHeight: number;
	positionWidth: number;
	previous: PixiCardBoundSnapshot;
	state: PixiCardRenderState;
	textureUid: number | null;
};

function hasTerminalStateChanged(previousState: PixiCardRenderState | null, nextState: PixiCardRenderState): boolean {
	return !previousState
		|| getTerminalStateKey(previousState.terminalState) !== getTerminalStateKey(nextState.terminalState);
}

function hasChromeStateChanged(previousState: PixiCardRenderState | null, nextState: PixiCardRenderState): boolean {
	return !previousState
		|| previousState.hovered !== nextState.hovered
		|| previousState.projectorHovered !== nextState.projectorHovered
		|| previousState.actionMenuOpen !== nextState.actionMenuOpen
		|| previousState.exitingStartedAtMs !== nextState.exitingStartedAtMs
		|| previousState.focused !== nextState.focused
		|| previousState.selected !== nextState.selected
		|| previousState.itemSelected !== nextState.itemSelected
		|| hasTerminalStateChanged(
			previousState,
			nextState,
		)
		|| previousState.placeholder !== nextState.placeholder
		|| previousState.effectsEnabled !== nextState.effectsEnabled;
}

function resolveNeonTurnOnStartedAt(previousState: PixiCardRenderState | null, nextState: PixiCardRenderState, previousStartedAt: number | null, nowMs: number): number | null {
	const neonWasLit = previousState ? isNeonTargetLit(previousState) : false;
	const neonIsLit  = isNeonTargetLit(nextState);
	if (neonIsLit && !neonWasLit) {
		return nowMs;
	}
	if (!neonIsLit) {
		return null;
	}
	return previousStartedAt;
}

function resolveActionMenuTransitionStartedAt(previous: PixiCardBoundSnapshot, itemChanged: boolean, nextState: PixiCardRenderState, nowMs: number): number | null {
	if (!previous.boundState || itemChanged) {
		// Pooled card renderers are rebound while scrolling and during startup. A fresh
		// card must render in its final terminal state instead of inheriting pool motion.
		return null;
	}
	if (previous.boundState.actionMenuOpen !== nextState.actionMenuOpen) {
		return nowMs;
	}
	return previous.actionMenuTransitionStartedAt;
}

function isTerminalAnimationActive(terminalState: MediaWallTerminalState | null, nowMs: number): boolean {
	if (!terminalState) {
		return false;
	}
	if (terminalState.kind === "running") {
		return true;
	}
	if (terminalState.kind !== "confirm") {
		return false;
	}

	const typewriterDurationMs = terminalState.message.length * TERMINAL_TYPEWRITER_MS_PER_CHAR;
	// Keep one extra typewriter interval so the final full-message frame is drawn before
	// the static confirmation panel stops asking the wall for animation frames.
	return nowMs - terminalState.startedAtMs <= typewriterDurationMs + TERMINAL_TYPEWRITER_MS_PER_CHAR;
}

// The bind model owns animation invalidation decisions; the renderer owns the
// actual Pixi mutations. Keeping this pure makes pooled-card reuse rules testable.
export function createPixiCardBindDecision({
																						 isWatched,
																						 itemKey,
																						 nowMs,
																						 positionHeight,
																						 positionWidth,
																						 previous,
																						 state,
																						 textureUid,
																					 }: PixiCardBindDecisionInput): PixiCardBindDecision {
	const itemChanged                   = previous.boundKey !== itemKey;
	const sizeChanged                   = previous.boundWidth !== positionWidth || previous.boundHeight !== positionHeight;
	const textureChanged                = previous.boundTextureUid !== textureUid;
	const terminalStateChanged          = hasTerminalStateChanged(
		previous.boundState,
		state,
	);
	const chromeStateChanged            = hasChromeStateChanged(
		previous.boundState,
		state,
	);
	const neonTurnOnStartedAt           = resolveNeonTurnOnStartedAt(
		previous.boundState,
		state,
		previous.neonTurnOnStartedAt,
		nowMs,
	);
	const neonAnimation                 = isNeonTargetLit(state)
		? getNeonTurnOnIntensity(
			neonTurnOnStartedAt,
			nowMs,
		)
		: {
			intensity: 0,
			animating: false,
		};
	const actionMenuTransitionStartedAt = resolveActionMenuTransitionStartedAt(
		previous,
		itemChanged,
		state,
		nowMs,
	);
	const actionMenuElapsed             = actionMenuTransitionStartedAt === null
		? TERMINAL_TRANSITION_MS
		: nowMs - actionMenuTransitionStartedAt;
	const actionMenuTransitionActive    = actionMenuTransitionStartedAt !== null;
	const actionMenuAnimating           = actionMenuTransitionActive && actionMenuElapsed < TERMINAL_TRANSITION_MS;
	const actionMenuSettling            = actionMenuTransitionActive && actionMenuElapsed >= TERMINAL_TRANSITION_MS;
	const watchedStateChanged           = previous.boundWatched !== isWatched;
	const terminalAnimating = isTerminalAnimationActive(
		state.terminalState,
		nowMs,
	);
	const exitAnimation                 = getCardExitAnimation(
		state.exitingStartedAtMs,
		nowMs,
	);
	// Stable visual states must invalidate drawing without keeping the wall on a
	// permanent RAF loop; otherwise an idle library with watched cards can retain
	// per-frame Pixi allocations until the renderer process runs out of heap.
	const shouldUpdateGraphics = itemChanged
		|| sizeChanged
		|| chromeStateChanged
		|| neonAnimation.animating
		|| watchedStateChanged
		|| actionMenuAnimating
		|| actionMenuSettling
		|| terminalStateChanged
		|| terminalAnimating
		|| exitAnimation.animating;

	return {
		actionMenuAnimating,
		actionMenuSettling,
		actionMenuTransitionStartedAt,
		exitAnimation,
		hasActiveAnimation:    neonAnimation.animating
														 || actionMenuAnimating
														 || terminalAnimating
														 || exitAnimation.animating,
		isWatched,
		itemChanged,
		neonIntensity:         neonAnimation.intensity,
		neonTurnOnStartedAt,
		shouldUpdateGraphics,
		shouldUpdateText:      itemChanged || sizeChanged,
		shouldUpdateThumbnail: itemChanged || sizeChanged || textureChanged,
		sizeChanged,
		textureChanged,
	};
}
