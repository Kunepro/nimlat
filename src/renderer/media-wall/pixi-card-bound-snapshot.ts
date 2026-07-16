import type { MediaWallItemViewportPosition } from "../types/media-wall";
import type {
	PixiCardBindDecision,
	PixiCardBoundSnapshot,
} from "./pixi-card-bind-decision";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";

interface CommitPixiCardBoundSnapshotInput {
	decision: PixiCardBindDecision;
	itemKey: string;
	position: MediaWallItemViewportPosition;
	state: PixiCardRenderState;
	textureUid: number | null;
}

export function createInitialPixiCardBoundSnapshot(): PixiCardBoundSnapshot {
	return {
		actionMenuTransitionStartedAt: null,
		boundHeight:                   0,
		boundKey:                      null,
		boundState:                    null,
		boundTextureUid:               null,
		boundWatched:                  null,
		boundWidth:                    0,
		neonTurnOnStartedAt:           null,
	};
}

// Bind snapshots are the pooled-card memory used by the invalidation model.
// Settling terminal animations must draw once with the old transition timestamp,
// then commit a null timestamp so future no-op binds do not keep redrawing.
export function commitPixiCardBoundSnapshot({
																							decision,
																							itemKey,
																							position,
																							state,
																							textureUid,
																						}: CommitPixiCardBoundSnapshotInput): PixiCardBoundSnapshot {
	return {
		actionMenuTransitionStartedAt: decision.actionMenuSettling
																		 ? null
																		 : decision.actionMenuTransitionStartedAt,
		boundHeight:                   position.height,
		boundKey:                      itemKey,
		boundState:                    state,
		boundTextureUid:               textureUid,
		boundWatched:                  decision.isWatched,
		boundWidth:                    position.width,
		neonTurnOnStartedAt:           decision.neonTurnOnStartedAt,
	};
}
