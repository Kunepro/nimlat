import { Graphics } from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import {
	CARD_PROJECTOR_BOTTOM,
	CARD_PROJECTOR_HEIGHT,
} from "./pixi-card-geometry";
import { drawScrewHead } from "./pixi-card-metal-drawing";
import type { PixiCardProjectorState } from "./pixi-card-projector-model";

const PROJECTOR_CONE_DEGREES      = 120;
const PROJECTOR_CONE_HALF_RADIANS = (PROJECTOR_CONE_DEGREES / 2) * (Math.PI / 180);

function getProjectorBeamTargetOffset(position: MediaWallItemViewportPosition): number {
	// Edge cards have their DOM controls constrained toward the wall center, so the
	// projected light aims inward instead of pretending the target is directly above.
	if (position.column === 0) {
		return 24;
	}
	if (position.column === position.columns - 1) {
		return -24;
	}
	return 0;
}

function drawProjectorBeam(graphics: Graphics, position: MediaWallItemViewportPosition, lightIntensity: number, laserIntensity: number): void {
	const projectorCenterX = position.width / 2;
	const lensY            = position.height - 32;
	const beamReach        = 58;
	const beamTopY         = lensY - beamReach;
	const beamHalfWidth    = Math.tan(PROJECTOR_CONE_HALF_RADIANS) * beamReach;
	const beamTargetX      = projectorCenterX + getProjectorBeamTargetOffset(position);
	const laserAlpha       = lightIntensity * laserIntensity;
	if (lightIntensity <= 0) {
		graphics.clear();
		return;
	}

	// The beam intentionally fans upward into the canvas tracking rail; pointer
	// hit-testing lives in the media-wall controller so Pixi stays render-only.
	graphics
		.clear()
		.moveTo(
			projectorCenterX - 4,
			lensY - 2,
		)
		.lineTo(
			beamTargetX - beamHalfWidth,
			beamTopY,
		)
		.lineTo(
			beamTargetX + beamHalfWidth,
			beamTopY,
		)
		.lineTo(
			projectorCenterX + 4,
			lensY - 2,
		)
		.closePath()
		.fill({
			color: 0xff305a,
			alpha: 0.04 + (0.13 * lightIntensity),
		})
		.moveTo(
			projectorCenterX - 2,
			lensY - 3,
		)
		.lineTo(
			beamTargetX - beamHalfWidth * 0.48,
			beamTopY + 10,
		)
		.lineTo(
			beamTargetX + beamHalfWidth * 0.48,
			beamTopY + 10,
		)
		.lineTo(
			projectorCenterX + 2,
			lensY - 3,
		)
		.closePath()
		.fill({
			color: 0xff7588,
			alpha: 0.04 + (0.14 * lightIntensity),
		})
		.moveTo(
			projectorCenterX,
			lensY - 6,
		)
		.lineTo(
			beamTargetX,
			beamTopY + 8,
		)
		.stroke({
			color: 0xffd2d8,
			alpha: 0.12 + (0.24 * lightIntensity),
			width: 14,
		});

	for (let rayIndex = -4; rayIndex <= 4; rayIndex += 1) {
		const normalizedRay = rayIndex / 4;
		const edgeFalloff   = 1 - (Math.abs(normalizedRay) * 0.58);
		graphics
			.moveTo(
				projectorCenterX,
				lensY - 4,
			)
			.lineTo(
				beamTargetX + beamHalfWidth * normalizedRay,
				beamTopY + Math.abs(rayIndex) * 3,
			)
			.stroke({
				color: rayIndex === 0 ? 0xffe0e4 : 0xff4868,
				alpha: ((rayIndex === 0 ? 0.1 : 0.04) + (0.18 * laserAlpha)) * edgeFalloff,
				width: rayIndex === 0 ? 9 : 5.5,
			});
	}

	graphics
		.moveTo(
			projectorCenterX,
			lensY - 5,
		)
		.lineTo(
			beamTargetX,
			beamTopY + 6,
		)
		.stroke({
			color: 0xffffff,
			alpha: 0.28 + (0.56 * laserAlpha),
			width: 2.2 + (2.2 * laserIntensity),
		})
		.moveTo(
			projectorCenterX - 5,
			lensY - 4,
		)
		.lineTo(
			projectorCenterX + 5,
			lensY - 4,
		)
		.stroke({
			color: 0xfff4f6,
			alpha: 0.22 + (0.64 * laserAlpha),
			width: 1.6,
		});
}

function drawProjectorHardware(graphics: Graphics, position: MediaWallItemViewportPosition, lightIntensity: number): void {
	const projectorWidth  = 54;
	const projectorHeight = CARD_PROJECTOR_HEIGHT;
	const projectorX      = (position.width - projectorWidth) / 2;
	const projectorY      = position.height - CARD_PROJECTOR_BOTTOM;
	const lensX           = position.width / 2;
	const lensY           = projectorY + 10;
	const ledAlpha        = 0.72 + (0.28 * lightIntensity);

	graphics
		.clear()
		.roundRect(
			projectorX,
			projectorY,
			projectorWidth,
			projectorHeight,
			5,
		)
		.fill({
			color: 0x252b2d,
			alpha: 0.98,
		})
		.stroke({
			color: 0xc7d0d1,
			alpha: 0.72,
			width: 1,
		})
		.roundRect(
			projectorX + 3,
			projectorY + 2,
			projectorWidth - 6,
			6,
			3,
		)
		.fill({
			color: 0xe2e8e8,
			alpha: 0.15,
		})
		.roundRect(
			projectorX + 4,
			projectorY + projectorHeight - 7,
			projectorWidth - 8,
			5,
			2,
		)
		.fill({
			color: 0x050708,
			alpha: 0.34,
		})
		.circle(
			lensX,
			lensY,
			7,
		)
		.fill({
			color: 0x4a0712,
			alpha: 0.98,
		})
		.stroke({
			color: 0xffc2ca,
			alpha: 0.46 + (0.3 * lightIntensity),
			width: 1.2,
		})
		.circle(
			lensX,
			lensY,
			4.4,
		)
		.fill({
			color: 0xff2e55,
			alpha: ledAlpha,
		})
		.circle(
			lensX,
			lensY,
			2.4,
		)
		.fill({
			color: 0xffb3bf,
			alpha: 0.24 + (0.62 * lightIntensity),
		})
		.circle(
			lensX - 1.6,
			lensY - 1.9,
			1.35,
		)
		.fill({
			color: 0xffeef1,
			alpha: 0.38 + (0.42 * lightIntensity),
		});

	drawScrewHead(
		graphics,
		projectorX + 7,
		projectorY + 10,
		1.25,
	);
	drawScrewHead(
		graphics,
		projectorX + projectorWidth - 7,
		projectorY + 10,
		1.25,
	);
}

export function updateProjectorGraphics(
	projectorBeam: Graphics,
	projectorHardware: Graphics,
	position: MediaWallItemViewportPosition,
	projectorState: PixiCardProjectorState,
): void {
	projectorBeam.visible     = projectorState.lightIntensity > 0;
	projectorHardware.visible = true;
	drawProjectorBeam(
		projectorBeam,
		position,
		projectorState.lightIntensity,
		projectorState.laserIntensity,
	);
	drawProjectorHardware(
		projectorHardware,
		position,
		projectorState.lightIntensity,
	);
}
