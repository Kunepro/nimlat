import { Graphics } from "pixi.js";

export function drawScrewHead(graphics: Graphics, x: number, y: number, radius: number, litColor: number | null = null): void {
	const isLit      = litColor !== null;
	const screwColor = litColor ?? 0x23282b;
	const glowColor  = litColor ?? 0x000000;
	if (isLit) {
		graphics
			.circle(
				x,
				y,
				radius * 2.8,
			)
			.fill({
				color: glowColor,
				alpha: 0.22,
			});
	}
	graphics
		.circle(
			x,
			y,
			radius,
		)
		.fill({
			color: screwColor,
			alpha: isLit ? 1 : 0.94,
		})
		.stroke({
			color: isLit ? 0xb8ffd2 : 0xb8c0c3,
			alpha: isLit ? 0.94 : 0.72,
			width: isLit ? 0.9 : 0.75,
		})
		.moveTo(
			x - radius * 0.55,
			y,
		)
		.lineTo(
			x + radius * 0.55,
			y,
		)
		.stroke({
			color: isLit ? 0xf4fff7 : 0xe4e8e9,
			alpha: isLit ? 0.78 : 0.48,
			width: isLit ? 0.65 : 0.55,
		});
}

export function drawBrushedMetalPlaque(graphics: Graphics, x: number, y: number, width: number, height: number, radius: number): void {
	graphics
		.roundRect(
			x,
			y,
			width,
			height,
			radius,
		)
		.fill({
			color: 0x2b3032,
			alpha: 0.98,
		})
		.stroke({
			color: 0xaeb7ba,
			alpha: 0.76,
			width: 1,
		})
		.roundRect(
			x + 1.5,
			y + 1.5,
			width - 3,
			height - 3,
			Math.max(
				1,
				radius - 1,
			),
		)
		.stroke({
			color: 0x0c0f10,
			alpha: 0.78,
			width: 1.5,
		})
		.roundRect(
			x + 3,
			y + 2,
			width - 6,
			Math.max(
				2,
				height * 0.28,
			),
			Math.max(
				1,
				radius - 2,
			),
		)
		.fill({
			color: 0xd7dcdd,
			alpha: 0.16,
		})
		.roundRect(
			x + 3,
			y + height - Math.max(
				3,
				height * 0.22,
			) - 2,
			width - 6,
			Math.max(
				2,
				height * 0.22,
			),
			Math.max(
				1,
				radius - 2,
			),
		)
		.fill({
			color: 0x060808,
			alpha: 0.34,
		});

	for (let lineY = y + 4; lineY < y + height - 3; lineY += 4) {
		graphics
			.moveTo(
				x + 4,
				lineY,
			)
			.lineTo(
				x + width - 4,
				lineY,
			)
			.stroke({
				color: 0xf0f2f2,
				alpha: 0.075,
				width: 0.65,
			});
	}
}
