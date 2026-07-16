import type { Text } from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getNeonPlaqueLabelLayout } from "./pixi-card-neon-plaque-model";

export function updateNeonPlaqueLabels(
	topPlaqueLabel: Text,
	sidePlaqueLabel: Text,
	position: MediaWallItemViewportPosition,
): void {
	const layout = getNeonPlaqueLabelLayout(
		position,
		{
			height: topPlaqueLabel.height,
			width:  topPlaqueLabel.width,
		},
		{
			height: sidePlaqueLabel.height,
			width:  sidePlaqueLabel.width,
		},
	);

	topPlaqueLabel.position.set(
		layout.top.x,
		layout.top.y,
	);
	sidePlaqueLabel.position.set(
		layout.side.x,
		layout.side.y,
	);
	topPlaqueLabel.visible  = true;
	sidePlaqueLabel.visible = true;
}
