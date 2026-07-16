import { Graphics } from "pixi.js";

import type {
	BackgroundSize,
	SynthwaveRoadGeometry,
} from "../../../types/pixi-background";
import {
	clamp,
	drawLine,
} from "./pixi-background-layer.utils";
import { createSynthwaveRoadGeometry } from "./synthwave-road-geometry";

export function drawSynthwaveRoad(road: Graphics, size: BackgroundSize, elapsedMs: number): void {
	const {
					height,
				}            = size;
	const roadGeometry = createSynthwaveRoadGeometry(size);
	const glowPulse    = 0.75 + (Math.sin(elapsedMs / 1400) * 0.16);

	// Road slab: narrow trapezoid into the horizon, fully opaque to hide the grid/sun underneath.
	road
		.clear()
		.moveTo(
			roadGeometry.centerX - roadGeometry.roadTopHalf,
			roadGeometry.horizonY,
		)
		.lineTo(
			roadGeometry.centerX + roadGeometry.roadTopHalf,
			roadGeometry.horizonY,
		)
		.lineTo(
			roadGeometry.centerX + roadGeometry.roadBottomHalf,
			height + 36,
		)
		.lineTo(
			roadGeometry.centerX - roadGeometry.roadBottomHalf,
			height + 36,
		)
		.closePath()
		.fill({
			color: 0x02050f,
			alpha: 1,
		});

	// Neon road edges establish perspective and stay independent from the full-width cyber grid.
	drawLine(
		road,
		roadGeometry.centerX - roadGeometry.roadTopHalf,
		roadGeometry.horizonY,
		roadGeometry.centerX - (roadGeometry.roadBottomHalf * 0.94),
		height,
		0xff49ca,
		0.72 * glowPulse,
		3,
	);
	drawLine(
		road,
		roadGeometry.centerX + roadGeometry.roadTopHalf,
		roadGeometry.horizonY,
		roadGeometry.centerX + (roadGeometry.roadBottomHalf * 0.94),
		height,
		0x00e1ff,
		0.68 * glowPulse,
		3,
	);

	drawCenterLaneDashes(
		road,
		size,
		roadGeometry,
		elapsedMs,
	);
}

export function drawSynthwaveGrid(grid: Graphics, size: BackgroundSize, offset: number): void {
	const roadGeometry = createSynthwaveRoadGeometry(size);
	grid.clear();

	drawHorizontalGridLines(
		grid,
		size,
		roadGeometry.horizonY,
		offset,
	);
	drawVerticalGridRays(
		grid,
		size,
		roadGeometry,
	);
}

function drawCenterLaneDashes(road: Graphics, size: BackgroundSize, roadGeometry: SynthwaveRoadGeometry, elapsedMs: number): void {
	// Center lane dashes scroll toward the viewer. Depth-squared spacing creates the perspective acceleration.
	const laneDashCount = 14;
	for (let laneDashIndex = 0; laneDashIndex < laneDashCount; laneDashIndex += 1) {
		const dashPhase     = ((elapsedMs / 1800) + (laneDashIndex / laneDashCount)) % 1;
		const startDepth    = dashPhase * dashPhase;
		const endDepth      = clamp(
			startDepth + 0.08 + (dashPhase * 0.1),
			0,
			1,
		);
		const startY        = roadGeometry.horizonY + ((size.height - roadGeometry.horizonY) * startDepth);
		const endY          = roadGeometry.horizonY + ((size.height - roadGeometry.horizonY) * endDepth);
		const startRoadHalf = roadGeometry.roadTopHalf + ((roadGeometry.roadBottomHalf - roadGeometry.roadTopHalf) * startDepth);
		const endRoadHalf   = roadGeometry.roadTopHalf + ((roadGeometry.roadBottomHalf - roadGeometry.roadTopHalf) * endDepth);
		drawLine(
			road,
			roadGeometry.centerX - (startRoadHalf * 0.08),
			startY,
			roadGeometry.centerX - (endRoadHalf * 0.08),
			endY,
			0xffd2f6,
			0.18 + (dashPhase * 0.38),
			1.4 + (dashPhase * 2.2),
		);
	}
}

function drawHorizontalGridLines(grid: Graphics, size: BackgroundSize, horizonY: number, offset: number): void {
	// Horizontal grid lines span the full skyline baseline and expand past the viewport at the bottom.
	for (let gridLineY = horizonY + offset; gridLineY < size.height + 36; gridLineY += 34) {
		const depth  = (gridLineY - horizonY) / Math.max(
			1,
			size.height - horizonY,
		);
		const leftX  = -size.width * 0.18 * depth;
		const rightX = size.width + (size.width * 0.18 * depth);
		drawLine(
			grid,
			leftX,
			gridLineY,
			rightX,
			gridLineY,
			0x00e1ff,
			0.11 + (depth * 0.25),
			1 + (depth * 1.3),
		);
	}
}

function drawVerticalGridRays(grid: Graphics, size: BackgroundSize, roadGeometry: SynthwaveRoadGeometry): void {
	// Vertical perspective rays start along the skyline baseline, not from a single vanishing point.
	for (let skylineX = 0; skylineX <= size.width; skylineX += 72) {
		const bottomX = skylineX + (((skylineX - roadGeometry.centerX) * 1.7));
		drawLine(
			grid,
			skylineX,
			roadGeometry.horizonY,
			bottomX,
			size.height,
			0x00e1ff,
			0.18,
			1,
		);
	}
}
