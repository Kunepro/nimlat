import type { Graphics } from "pixi.js";

export function clamp(value: number, min: number, max: number): number {
	return Math.min(
		max,
		Math.max(
			min,
			value,
		),
	);
}

export function randomBetween(min: number, max: number): number {
	return min + (Math.random() * (max - min));
}

export function drawLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, alpha: number, width: number): void {
	graphics
		.moveTo(
			x1,
			y1,
		)
		.lineTo(
			x2,
			y2,
		)
		.stroke({
			color,
			alpha,
			width,
		});
}
