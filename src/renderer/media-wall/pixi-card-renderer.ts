import { Texture } from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
} from "../types/media-wall";
import { createPixiCardBindDecision } from "./pixi-card-bind-decision";
import {
	commitPixiCardBoundSnapshot,
	createInitialPixiCardBoundSnapshot,
} from "./pixi-card-bound-snapshot";
import {
	createPixiCardParts,
	releasePixiCardParts,
} from "./pixi-card-parts";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";
import {
	updatePixiCardGraphicSurfaces,
	updatePixiCardTextSurfaces,
	updatePixiCardThumbnailSurface,
} from "./pixi-card-surface-renderer";
import { getTextureIdentity } from "./pixi-texture-identity";

// Draws one reusable Pixi card. The wall renderer owns pooling and binding; this
// class only knows how to turn one mapped item plus visual state into GPU primitives.
export class PixiCardRenderer<TItem> {
	private readonly parts    = createPixiCardParts();
	public readonly container = this.parts.container;

	// Per-card phase offsets keep the watched laser/glitch effect from syncing across the wall.
	private readonly watchedGlitchPhaseMs = Math.random() * 1200;
	private readonly mapItem: (item: TItem) => MediaWallItem;
	private boundSnapshot                 = createInitialPixiCardBoundSnapshot();

	public constructor(mapItem: (item: TItem) => MediaWallItem) {
		this.mapItem = mapItem;
	}

	public bind(item: TItem | null, index: number, position: MediaWallItemViewportPosition, state: PixiCardRenderState, texture: Texture | null): boolean {
		this.container.visible = true;
		const mapped            = item ? this.mapItem(item) : null;
		const itemKey           = mapped ? `${ mapped.id }` : `placeholder:${ index }`;
		const textureUid        = getTextureIdentity(texture);
		const nowMs             = performance.now();
		const decision          = createPixiCardBindDecision({
			previous:       this.boundSnapshot,
			itemKey,
			positionWidth:  position.width,
			positionHeight: position.height,
			textureUid,
			state,
			isWatched:      mapped?.isWatched === true,
			nowMs,
		});
		const { exitAnimation } = decision;
		this.container.alpha = exitAnimation.alpha;
		this.container.position.set(
			Math.round(position.x),
			Math.round(position.y + exitAnimation.offsetY),
		);

		if (decision.shouldUpdateText) {
			updatePixiCardTextSurfaces({
				mapped,
				parts: this.parts,
				position,
			});
		}

		if (decision.shouldUpdateGraphics) {
			updatePixiCardGraphicSurfaces({
				actionMenuTransitionStartedAt: decision.actionMenuTransitionStartedAt,
				itemKey,
				mapped,
				neonIntensity:                 decision.neonIntensity,
				nowMs,
				parts:                         this.parts,
				position,
				state,
				watchedGlitchPhaseMs:          this.watchedGlitchPhaseMs,
			});
		}

		if (decision.shouldUpdateThumbnail) {
			updatePixiCardThumbnailSurface({
				parts: this.parts,
				position,
				texture,
			});
		}

		this.boundSnapshot = commitPixiCardBoundSnapshot({
			decision,
			itemKey,
			position,
			state,
			textureUid,
		});
		return decision.hasActiveAnimation;
	}

	public release(): void {
		releasePixiCardParts(this.parts);
		this.boundSnapshot = createInitialPixiCardBoundSnapshot();
	}

	public destroy(): void {
		this.parts.thumbnailSprite.texture = Texture.EMPTY;
		this.container.destroy({
			children: true,
		});
	}
}
