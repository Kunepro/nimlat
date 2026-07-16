import {
	Container,
	Graphics,
} from "pixi.js";

import type {
	BackgroundSize,
	SynthwaveRoadGeometry,
} from "../../../types/pixi-background";
import { clamp } from "./pixi-background-layer.utils";
import { createSynthwaveRoadGeometry } from "./synthwave-road-geometry";

const PALM_COUNT_PER_SIDE = 12;
const PALM_SPRITE_COUNT = PALM_COUNT_PER_SIDE * 2;
const PALM_PATH_D       = `M142.4,42.9c2-4.3,6.6-8.3,14.6-11.5V14.6l8.7,13.8c2.9-0.9,6.3-1.6,9.3-2.2V9l9.8,15.8
	c1.7-0.2,3.2-0.3,5.2-0.4V9l9.4,15.2c8.6,0.2,17.3,1.4,25.3,3.9C220.9,16,200.4,5,196.9,4.3c-35.7-10.9-68.8,20-69.4,28.3
	C115.5-1,60.6,1,34.9,30.7c20.1-5.2,76.4-2.8,80.4,15.5c-12.6-2.8-60.7-31.6-87,48.5c52.3-30.9,76.1-42.3,81.9-38.2
	c-39.1,13.8-25.6,52.1-25.6,52.1s13.7-32.1,30.1-35l2.8,0.2c-15.6,60.8-22.5,112-3.8,174l30.8,0
	c-24.1-57-20.3-111-7.6-173.1l2.6,0.2c8.9,4.9,26.5,33.6,29.8,42.9c6.3-22.6-0.5-42.7-19.1-57.1c2.8-1.6,8.9-1.5,16.5-0.3l2.5-14
	l7.3,15.8l-0.2,0c2.9,0.6,5.8,1.3,8.8,2.1l4.5-18l4.8,20.6c2.3,0.7,4.5,1.3,6.6,2l4.2-16.7l4.6,19.7c6.9,2.4,12.3,4.7,14.8,6.1
	C223.3,61.5,201.4,21,142.4,42.9z`;
const PALM_SVG          = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <path fill="none" stroke="#00e5ff" stroke-opacity="0.04" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" d="${ PALM_PATH_D }"/>
  <path fill="none" stroke="#ff3bd4" stroke-opacity="0.025" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" d="${ PALM_PATH_D }"/>
  <path fill="#02050f" stroke="#46f3ff" stroke-opacity="0.06" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round" d="${ PALM_PATH_D }"/>
</svg>
`;

interface PalmMotionSettings {
	palmCycleMs: number;
	offscreenExitDistance: number;
	roadGapAtHorizon: number;
	roadGapAtViewer: number;
	passByStartYRatio: number;
	minPalmScale: number;
	maxPalmScale: number;
}

interface PalmPlacementContext {
	palmGraphics: Graphics[];
	size: BackgroundSize;
	roadGeometry: SynthwaveRoadGeometry;
	palmMotionSettings: PalmMotionSettings;
	elapsedMs: number;
}

export function drawSynthwavePassingPalms(palms: Container, size: BackgroundSize, elapsedMs: number): void {
	const roadGeometry                           = createSynthwaveRoadGeometry(size);
	const palmMotionSettings                     = createPalmMotionSettings(size.width);
	const palmGraphics                           = ensurePalmGraphics(palms);
	const placementContext: PalmPlacementContext = {
		palmGraphics,
		size,
		roadGeometry,
		palmMotionSettings,
		elapsedMs,
	};

	// Palms are a foreground roadside layer. Their position follows the road geometry, but their
	// sprite pooling and motion stay separate from road/grid drawing so they can be tuned alone.
	positionPalmsOnSide(
		placementContext,
		-1,
		0,
	);
	positionPalmsOnSide(
		placementContext,
		1,
		PALM_COUNT_PER_SIDE,
	);
}

function ensurePalmGraphics(palms: Container): Graphics[] {
	growPalmPool(palms);
	shrinkPalmPool(palms);

	return palms.children.map((child) => child as Graphics);
}

function growPalmPool(palms: Container): void {
	while (palms.children.length < PALM_SPRITE_COUNT) {
		const palm = new Graphics()
			.svg(PALM_SVG);
		palm.pivot.set(
			128,
			256,
		);
		palms.addChild(palm);
	}
}

function shrinkPalmPool(palms: Container): void {
	while (palms.children.length > PALM_SPRITE_COUNT) {
		palms.removeChildAt(palms.children.length - 1).destroy();
	}
}

function createPalmMotionSettings(width: number): PalmMotionSettings {
	return {
		palmCycleMs:           42_000,
		offscreenExitDistance: 460,
		roadGapAtHorizon:      width * 0.01,
		roadGapAtViewer:       width * 0.18,
		passByStartYRatio:     0.86,
		minPalmScale:          0.18,
		maxPalmScale:          1.9,
	};
}

function positionPalmsOnSide(
	placementContext: PalmPlacementContext,
	side: -1 | 1,
	firstPalmIndex: number,
): void {
	for (let palmSideIndex = 0; palmSideIndex < PALM_COUNT_PER_SIDE; palmSideIndex += 1) {
		const palm = placementContext.palmGraphics[ firstPalmIndex + palmSideIndex ];
		if (!palm) {
			continue;
		}

		positionSinglePalm(
			placementContext,
			palm,
			palmSideIndex,
			side,
		);
	}
}

function positionSinglePalm(
	placementContext: PalmPlacementContext,
	palm: Graphics,
	palmSideIndex: number,
	side: -1 | 1,
): void {
	const {
					elapsedMs,
					palmMotionSettings,
					roadGeometry,
					size,
				}                   = placementContext;
	const stagger             = palmSideIndex / PALM_COUNT_PER_SIDE;
	const sideTimingOffset    = side > 0 ? 0.04 : 0;
	const travelProgress      = ((elapsedMs / palmMotionSettings.palmCycleMs) + stagger + sideTimingOffset) % 1;
	const perspectiveProgress = travelProgress * travelProgress;
	const startY              = roadGeometry.horizonY;
	const endY                = size.height + palmMotionSettings.offscreenExitDistance;
	const y                   = startY + ((endY - startY) * perspectiveProgress);
	const passByStartY        = size.height * palmMotionSettings.passByStartYRatio;
	const visibleDepth        = clamp(
		(y - startY) / Math.max(
			1,
			passByStartY - startY,
		),
		0,
		1,
	);
	const startX              = roadGeometry.centerX + (side * (roadGeometry.roadTopHalf + palmMotionSettings.roadGapAtHorizon));
	const endX                = roadGeometry.centerX + (side * (roadGeometry.roadBottomHalf + palmMotionSettings.roadGapAtViewer));
	const x                   = startX + ((endX - startX) * perspectiveProgress);
	const scale               = palmMotionSettings.minPalmScale
		+ ((palmMotionSettings.maxPalmScale - palmMotionSettings.minPalmScale) * visibleDepth);
	const horizontalMirror    = side > 0 ? -1 : 1;

	// SVG silhouette replaces procedural line palms so the shape is editable as one vector asset.
	palm.visible = true;
	palm.alpha   = 1;
	palm.position.set(
		x,
		y,
	);
	palm.scale.set(
		horizontalMirror * scale,
		scale,
	);
	palm.rotation = 0;
}
