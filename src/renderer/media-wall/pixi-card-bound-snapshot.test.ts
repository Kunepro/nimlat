// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import type { PixiCardBindDecision } from "./pixi-card-bind-decision";
import {
	commitPixiCardBoundSnapshot,
	createInitialPixiCardBoundSnapshot,
} from "./pixi-card-bound-snapshot";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";

function createPosition(): MediaWallItemViewportPosition {
	return {
		column:  0,
		columns: 4,
		height:  252,
		index:   3,
		row:     0,
		width:   120,
		x:       40,
		y:       80,
	};
}

function createRenderState(): PixiCardRenderState {
	return {
		actionMenuOpen:     true,
		effectsEnabled:     true,
		exitingStartedAtMs: null,
		focused:            false,
		hovered:            true,
		itemSelected:       false,
		placeholder:        false,
		projectorHovered:   false,
		selected:           false,
		terminalState:      {
			kind:        "menu",
			index:       3,
			startedAtMs: 10,
		},
	};
}

function createDecision(overrides: Partial<PixiCardBindDecision> = {}): PixiCardBindDecision {
	return {
		actionMenuAnimating:           false,
		actionMenuSettling:            false,
		actionMenuTransitionStartedAt: 1_000,
		exitAnimation:                 {
			alpha:     1,
			animating: false,
			offsetY:   0,
		},
		hasActiveAnimation:            false,
		isWatched:                     true,
		itemChanged:                   false,
		neonIntensity:                 1,
		neonTurnOnStartedAt:           900,
		shouldUpdateGraphics:          true,
		shouldUpdateText:              false,
		shouldUpdateThumbnail:         false,
		sizeChanged:                   false,
		textureChanged:                false,
		...overrides,
	};
}

describe(
	"pixi card bound snapshot",
	() => {
		it(
			"creates the blank pooled-card snapshot used after release",
			() => {
				expect(createInitialPixiCardBoundSnapshot()).toEqual({
					actionMenuTransitionStartedAt: null,
					boundHeight:                   0,
					boundKey:                      null,
					boundState:                    null,
					boundTextureUid:               null,
					boundWatched:                  null,
					boundWidth:                    0,
					neonTurnOnStartedAt:           null,
				});
			},
		);

		it(
			"commits the latest bind metadata for the next invalidation decision",
			() => {
				const state    = createRenderState();
				const position = createPosition();

				expect(commitPixiCardBoundSnapshot({
					decision:   createDecision(),
					itemKey:    "media-3",
					position,
					state,
					textureUid: 44,
				})).toEqual({
					actionMenuTransitionStartedAt: 1_000,
					boundHeight:                   252,
					boundKey:                      "media-3",
					boundState:                    state,
					boundTextureUid:               44,
					boundWatched:                  true,
					boundWidth:                    120,
					neonTurnOnStartedAt:           900,
				});
			},
		);

		it(
			"clears a settling terminal transition after the final frame is drawn",
			() => {
				const snapshot = commitPixiCardBoundSnapshot({
					decision:   createDecision({
						actionMenuSettling: true,
					}),
					itemKey:    "media-3",
					position:   createPosition(),
					state:      createRenderState(),
					textureUid: 44,
				});

				expect(snapshot.actionMenuTransitionStartedAt).toBeNull();
			},
		);
	},
);
