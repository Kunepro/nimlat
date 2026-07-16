import type { PixiCardRenderState } from "./pixi-card-renderer-types";

const NEON_TURN_ON_DURATION_MS = 520;
const CARD_EXIT_TRANSITION_MS  = 190;

export function isNeonTargetLit(state: PixiCardRenderState): boolean {
	return state.effectsEnabled && (state.hovered || state.focused || state.selected || state.actionMenuOpen);
}

export function getNeonTurnOnIntensity(startedAt: number | null, nowMs: number = performance.now()): {
	intensity: number;
	animating: boolean;
} {
	if (startedAt === null) {
		return {
			intensity: 1,
			animating: false,
		};
	}
	const elapsed = nowMs - startedAt;
	if (elapsed < 55) {
		return {
			intensity: 0,
			animating: true,
		};
	}
	if (elapsed < 105) {
		return {
			intensity: 1,
			animating: true,
		};
	}
	if (elapsed < 165) {
		return {
			intensity: 0,
			animating: true,
		};
	}
	if (elapsed < 225) {
		return {
			intensity: 1,
			animating: true,
		};
	}
	if (elapsed < 290) {
		return {
			intensity: 1,
			animating: true,
		};
	}
	if (elapsed < 360) {
		return {
			intensity: 0,
			animating: true,
		};
	}
	if (elapsed < NEON_TURN_ON_DURATION_MS) {
		return {
			intensity: 1,
			animating: true,
		};
	}
	return {
		intensity: 1,
		animating: false,
	};
}

export function getCardExitAnimation(startedAtMs: number | null, nowMs: number = performance.now()): {
	alpha: number;
	offsetY: number;
	animating: boolean;
} {
	if (startedAtMs === null) {
		return {
			alpha:     1,
			offsetY:   0,
			animating: false,
		};
	}
	const progress = Math.min(
		1,
		Math.max(
			0,
			(nowMs - startedAtMs) / CARD_EXIT_TRANSITION_MS,
		),
	);
	const eased    = 1 - ((1 - progress) ** 3);
	return {
		alpha:     1 - eased,
		offsetY:   8 * eased,
		animating: progress < 1,
	};
}
