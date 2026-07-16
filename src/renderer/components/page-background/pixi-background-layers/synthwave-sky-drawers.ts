import type { Graphics } from "pixi.js";

import type { BackgroundSize } from "../../../types/pixi-background";
import {
	clamp,
	drawLine,
} from "./pixi-background-layer.utils";

interface SynthwaveStaticLayers {
	horizon: Graphics;
	scanlines: Graphics;
	sky: Graphics;
	skyline: Graphics;
	sun: Graphics;
}

export function drawSynthwaveStatic(layers: SynthwaveStaticLayers, size: BackgroundSize): void {
	const {
					horizon,
					scanlines,
					sky,
					skyline,
					sun,
				} = layers;
	const {
					width,
					height,
				}        = size;
	const horizonY = height * 0.58;

	// Sky base: dark blue-black bands behind every other synthwave element.
	sky
		.clear()
		.rect(
			0,
			0,
			width,
			height,
		)
		.fill({ color: 0x040711 })
		.rect(
			0,
			0,
			width,
			height * 0.62,
		)
		.fill({
			color: 0x071229,
			alpha: 0.92,
		});

	// Red horizon sun. It is positioned low and later masked by the horizon/city layer below.
	sun.clear();
	const sunX      = width * 0.5;
	const sunY      = clamp(
		horizonY,
		180,
		height * 0.64,
	);
	const sunRadius = Math.min(
		width * 0.2,
		height * 0.32,
		300,
	);
	sun.position.set(
		sunX,
		sunY,
	);
	sun.pivot.set(
		sunX,
		sunY,
	);
	sun
		.circle(
			sunX,
			sunY,
			sunRadius,
		)
		.fill({
			color: 0xff315f,
			alpha: 0.44,
		});
	// Keep the sun as a solid disk; horizontal stripe cuts read as stray bars when the city overlaps it.

	// Horizon mask: fully opaque because the sun must never bleed under the city, road, or grid.
	horizon
		.clear()
		.rect(
			0,
			horizonY,
			width,
			height - horizonY,
		)
		.fill({
			color: 0x02050f,
			alpha: 1,
		})
		.rect(
			0,
			horizonY - 2,
			width,
			3,
		)
		.fill({
			color: 0x00e1ff,
			alpha: 0.18,
		});

	drawSynthwaveNightCity(
		skyline,
		size,
		0,
	);
	drawSynthwaveScanlines(
		scanlines,
		size,
	);
}

export function drawSynthwaveBeams(beams: Graphics, size: BackgroundSize, elapsedMs: number): void {
	const {
					width,
					height,
				}         = size;
	const horizonY  = height * 0.58;
	const beamSeeds = [
		[
			0.28,
			0,
			0.18,
			0.09,
			0.2,
			0.045,
			0.04,
			0xff49ca,
		],
		[
			0.68,
			-6,
			0.62,
			0.12,
			1.8,
			0.038,
			0.036,
			0x00e1ff,
		],
		[
			0.68,
			7,
			0.78,
			0.1,
			3.4,
			0.034,
			0.034,
			0xff49ca,
		],
	];

	beams.clear();
	// Disco beams pivot from fixed city-floor points. Opacity stays constant; only the aim point sweeps.
	for (const [
							 baseXRatio,
							 baseOffsetPx,
							 targetCenterRatio,
							 targetSweepRatio,
							 phaseOffset,
							 coneHalfWidthRatio,
							 alpha,
							 color,
						 ] of beamSeeds) {
		const x             = (width * baseXRatio) + baseOffsetPx;
		const topX          = width * (targetCenterRatio + (Math.sin((elapsedMs / 6200) + phaseOffset) * targetSweepRatio));
		const beamHalfWidth = width * coneHalfWidthRatio;
		beams
			.moveTo(
				x,
				horizonY,
			)
			.lineTo(
				topX - beamHalfWidth,
				height * 0.04,
			)
			.lineTo(
				topX + beamHalfWidth,
				height * 0.04,
			)
			.closePath()
			.fill({
				color,
				alpha,
			});
	}
}

function isSynthwaveWindowBlinking(elapsedMs: number, buildingIndex: number, column: number, row: number): boolean {
	// Stable phase offsets keep the skyline alive without storing per-window animation state.
	const phase = (elapsedMs / 980) + (buildingIndex * 2.7) + (column * 0.8) + row;
	return Math.sin(phase) > 0.74;
}

export function drawSynthwaveNightCity(skyline: Graphics, size: BackgroundSize, elapsedMs: number): void {
	const {
					width,
					height,
				}        = size;
	const horizonY = height * 0.58;

	skyline.clear();
	let xRatio        = 0.018;
	let buildingIndex = 0;
	// Dense low skyline: deterministic pseudo-random widths/heights keep buildings tight without storing fixtures.
	while (xRatio < 0.982) {
		const widthRatio     = 0.018 + (((buildingIndex * 7) % 11) * 0.0024);
		const heightRatio    = 0.052 + (((buildingIndex * 5) % 13) * 0.006);
		const buildingWidth  = width * widthRatio;
		const buildingHeight = height * heightRatio;
		const buildingX      = width * xRatio;
		const buildingY      = horizonY - buildingHeight;
		skyline
			.rect(
				buildingX,
				buildingY,
				buildingWidth,
				buildingHeight,
			)
			.fill({
				color: 0x020814,
				alpha: 1,
			})
			.stroke({
				color: 0x00e1ff,
				alpha: 0.13,
				width: 1,
			});

		const columns = Math.max(
			2,
			Math.floor(buildingWidth / 13),
		);
		const rows    = Math.max(
			2,
			Math.floor(buildingHeight / 13),
		);
		// Window lights blink by building/row/column phase so animation is stable but non-uniform.
		for (let column = 0; column < columns; column += 1) {
			for (let row = 0; row < rows; row += 1) {
				if ((column + row + buildingIndex) % 3 === 0) {
					continue;
				}
				const blink = isSynthwaveWindowBlinking(
					elapsedMs,
					buildingIndex,
					column,
					row,
				);
				skyline
					.rect(
						buildingX + 5 + (column * (buildingWidth / columns)),
						buildingY + 7 + (row * (buildingHeight / rows)),
						Math.max(
							2,
							buildingWidth / (columns * 5),
						),
						Math.max(
							2,
							buildingHeight / (rows * 5),
						),
					)
					.fill({
						color: blink ? 0xffd2f6 : 0x00e1ff,
						alpha: blink ? 0.34 : 0.12,
					});
			}
		}

		xRatio += widthRatio + 0.006 + (((buildingIndex * 3) % 5) * 0.0016);
		buildingIndex += 1;
	}

	// No central sign: horizontal flashing rectangles read too much like misplaced Delorean tail details.
	// Thin skyline baseline aligns the city, grid horizon, and road vanishing area.
	drawLine(
		skyline,
		0,
		horizonY,
		width,
		horizonY,
		0x00e1ff,
		0.32,
		1,
	);
}

function drawSynthwaveScanlines(scanlines: Graphics, size: BackgroundSize): void {
	const {
					width,
					height,
				} = size;
	scanlines.clear();
	// Static display scanlines over the whole scene; refreshBand handles the animated sweep separately.
	for (let y = 0; y < height; y += 7) {
		scanlines
			.rect(
				0,
				y,
				width,
				1,
			)
			.fill({
				color: 0xffffff,
				alpha: 0.035,
			});
	}
}

export function drawSynthwaveRefreshBand(refreshBand: Graphics, size: BackgroundSize, elapsedMs: number): void {
	const {
					width,
					height,
				} = size;
	const y = ((elapsedMs / 28) % (height + 220)) - 110;
	// Screen-space CRT refresh sweep: all bars stay perfectly horizontal and move together so
	// the effect reads as display timing, not scene debris or weather.
	refreshBand
		.clear();

	drawPrimaryRefreshSweep(
		refreshBand,
		width,
		y,
	);
	drawSecondaryRefreshSweep(
		refreshBand,
		width,
		((elapsedMs / 15) % (height + 180)) - 90,
		0x00e1ff,
	);
	drawSecondaryRefreshSweep(
		refreshBand,
		width,
		(((elapsedMs + 3_700) / 12) % (height + 260)) - 130,
		0xff49ca,
	);
}

function drawPrimaryRefreshSweep(refreshBand: Graphics, width: number, y: number): void {
	refreshBand
		.rect(
			0,
			y - 42,
			width,
			84,
		)
		.fill({
			color: 0x00e1ff,
			alpha: 0.018,
		})
		.rect(
			0,
			y - 11,
			width,
			22,
		)
		.fill({
			color: 0xffffff,
			alpha: 0.028,
		})
		.rect(
			0,
			y,
			width,
			2,
		)
		.fill({
			color: 0xffffff,
			alpha: 0.16,
		})
		.rect(
			0,
			y + 5,
			width,
			1,
		)
		.fill({
			color: 0xff49ca,
			alpha: 0.055,
		});
}

function drawSecondaryRefreshSweep(refreshBand: Graphics, width: number, y: number, color: number): void {
	// Secondary sweeps move faster with fixed phase offsets: visually irregular, but deterministic per frame.
	refreshBand
		.rect(
			0,
			y - 9,
			width,
			18,
		)
		.fill({
			color,
			alpha: 0.012,
		})
		.rect(
			0,
			y,
			width,
			1,
		)
		.fill({
			color: 0xffffff,
			alpha: 0.075,
		});
}
