import {
	Sprite,
	Texture,
} from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getPixiCardThumbnailLayout } from "./pixi-card-thumbnail-layout-model";

export function updatePixiCardThumbnailSprite(
	thumbnailSprite: Sprite,
	texture: Texture | null,
	position: MediaWallItemViewportPosition,
): void {
	if (!texture || texture.destroyed) {
		thumbnailSprite.texture = Texture.EMPTY;
		thumbnailSprite.visible = false;
		return;
	}

	const layout = getPixiCardThumbnailLayout(
		position,
		{
			height: texture.height,
			width:  texture.width,
		},
	);
	if (!layout) {
		thumbnailSprite.texture = Texture.EMPTY;
		thumbnailSprite.visible = false;
		return;
	}

	thumbnailSprite.texture = texture;
	thumbnailSprite.position.set(
		layout.x,
		layout.y,
	);
	thumbnailSprite.width   = layout.width;
	thumbnailSprite.height  = layout.height;
	thumbnailSprite.alpha   = layout.alpha;
	thumbnailSprite.visible = true;
}
