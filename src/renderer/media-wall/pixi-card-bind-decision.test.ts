// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createPixiCardBindDecision,
	type PixiCardBoundSnapshot,
} from "./pixi-card-bind-decision";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";
import { TERMINAL_TRANSITION_MS } from "./pixi-card-terminal-model";

function createRenderState(overrides: Partial<PixiCardRenderState> = {}): PixiCardRenderState {
	return {
		hovered:            false,
		projectorHovered:   false,
		actionMenuOpen:     false,
		exitingStartedAtMs: null,
		selected:           false,
		focused:            false,
		placeholder:        false,
		effectsEnabled:     true,
		itemSelected:       false,
		terminalState:      null,
		...overrides,
	};
}

function createSnapshot(overrides: Partial<PixiCardBoundSnapshot> = {}): PixiCardBoundSnapshot {
	return {
		actionMenuTransitionStartedAt: null,
		boundHeight:                   252,
		boundKey:                      "media-1",
		boundState:                    createRenderState(),
		boundTextureUid:               7,
		boundWatched:                  false,
		boundWidth:                    120,
		neonTurnOnStartedAt:           null,
		...overrides,
	};
}

describe(
	"pixi card bind decision",
	() => {
		it(
			"invalidates all visual surfaces for a fresh bound card without inheriting terminal motion",
			() => {
				const decision = createPixiCardBindDecision({
					previous:       createSnapshot({
						boundKey:   null,
						boundState: null,
					}),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						actionMenuOpen: true,
						hovered:        true,
					}),
					isWatched:      false,
					nowMs:          1_000,
				});

				expect(decision).toMatchObject({
					actionMenuTransitionStartedAt: null,
					actionMenuAnimating:           false,
					itemChanged:                   true,
					neonTurnOnStartedAt:           1_000,
					shouldUpdateGraphics:          true,
					shouldUpdateText:              true,
					shouldUpdateThumbnail:         true,
				});
				expect(decision.hasActiveAnimation).toBe(true);
			},
		);

		it(
			"starts terminal transition only when the same pooled card changes menu openness",
			() => {
				const previous = createSnapshot({
					boundState: createRenderState({
						actionMenuOpen: false,
					}),
				});
				const decision = createPixiCardBindDecision({
					previous,
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						actionMenuOpen: true,
					}),
					isWatched:      false,
					nowMs:          2_000,
				});

				expect(decision.actionMenuTransitionStartedAt).toBe(2_000);
				expect(decision.actionMenuAnimating).toBe(true);
				expect(decision.shouldUpdateGraphics).toBe(true);
				expect(decision.hasActiveAnimation).toBe(true);
			},
		);

		it(
			"marks a completed terminal transition as settling so the renderer draws the final frame once",
			() => {
				const decision = createPixiCardBindDecision({
					previous:       createSnapshot({
						actionMenuTransitionStartedAt: 2_000,
					}),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState(),
					isWatched:      false,
					nowMs:          2_000 + TERMINAL_TRANSITION_MS,
				});

				expect(decision.actionMenuAnimating).toBe(false);
				expect(decision.actionMenuSettling).toBe(true);
				expect(decision.shouldUpdateGraphics).toBe(true);
				expect(decision.hasActiveAnimation).toBe(false);
			},
		);

		it(
			"limits no-op binds to only the surfaces that actually changed",
			() => {
				const unchangedDecision = createPixiCardBindDecision({
					previous:       createSnapshot(),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState(),
					isWatched:      false,
					nowMs:          3_000,
				});
				const textureDecision   = createPixiCardBindDecision({
					previous:       createSnapshot(),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     8,
					state:          createRenderState(),
					isWatched:      false,
					nowMs:          3_000,
				});

				expect(unchangedDecision.shouldUpdateText).toBe(false);
				expect(unchangedDecision.shouldUpdateGraphics).toBe(false);
				expect(unchangedDecision.shouldUpdateThumbnail).toBe(false);
				expect(textureDecision.shouldUpdateText).toBe(false);
				expect(textureDecision.shouldUpdateGraphics).toBe(false);
				expect(textureDecision.shouldUpdateThumbnail).toBe(true);
			},
		);

		it(
			"does not keep stable watched or projector states on the active animation loop",
			() => {
				const watchedDecision       = createPixiCardBindDecision({
					previous:       createSnapshot({
						boundWatched: true,
					}),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState(),
					isWatched:      true,
					nowMs:          4_000,
				});
				const watchedChangeDecision = createPixiCardBindDecision({
					previous:       createSnapshot({
						boundWatched: false,
					}),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState(),
					isWatched:      true,
					nowMs:          4_000,
				});
				const projectorDecision     = createPixiCardBindDecision({
					previous:       createSnapshot(),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						projectorHovered: true,
					}),
					isWatched:      false,
					nowMs:          4_000,
				});

				expect(watchedDecision.shouldUpdateGraphics).toBe(false);
				expect(watchedDecision.hasActiveAnimation).toBe(false);
				expect(watchedChangeDecision.shouldUpdateGraphics).toBe(true);
				expect(watchedChangeDecision.hasActiveAnimation).toBe(false);
				expect(projectorDecision.shouldUpdateGraphics).toBe(true);
				expect(projectorDecision.hasActiveAnimation).toBe(false);
			},
		);

		it(
			"keeps terminal-running effects on the active animation loop",
			() => {
				const terminalDecision = createPixiCardBindDecision({
					previous:       createSnapshot(),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						terminalState: {
							actionId:    "refresh",
							index:       4,
							kind:        "running",
							label:       "Refresh",
							startedAtMs: 4_000,
						},
					}),
					isWatched:      false,
					nowMs:          4_000,
				});

				expect(terminalDecision.shouldUpdateGraphics).toBe(true);
				expect(terminalDecision.hasActiveAnimation).toBe(true);
			},
		);

		it(
			"stops confirmation terminal animation after the final message frame",
			() => {
				const confirmingDecision = createPixiCardBindDecision({
					previous:       createSnapshot(),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						terminalState: {
							actionId:    "delete",
							index:       2,
							kind:        "confirm",
							label:       "Delete",
							message:     "Delete this group?",
							startedAtMs: 4_000,
						},
					}),
					isWatched:      false,
					nowMs:          4_050,
				});
				const settledDecision    = createPixiCardBindDecision({
					previous:       createSnapshot({
						boundState: createRenderState({
							terminalState: {
								actionId:    "delete",
								index:       2,
								kind:        "confirm",
								label:       "Delete",
								message:     "Delete this group?",
								startedAtMs: 4_000,
							},
						}),
					}),
					itemKey:        "media-1",
					positionWidth:  120,
					positionHeight: 252,
					textureUid:     7,
					state:          createRenderState({
						terminalState: {
							actionId:    "delete",
							index:       2,
							kind:        "confirm",
							label:       "Delete",
							message:     "Delete this group?",
							startedAtMs: 4_000,
						},
					}),
					isWatched:      false,
					nowMs:          5_000,
				});

				expect(confirmingDecision.shouldUpdateGraphics).toBe(true);
				expect(confirmingDecision.hasActiveAnimation).toBe(true);
				expect(settledDecision.shouldUpdateGraphics).toBe(false);
				expect(settledDecision.hasActiveAnimation).toBe(false);
			},
		);
	},
);
