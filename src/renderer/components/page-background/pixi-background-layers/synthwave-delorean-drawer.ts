import type { Graphics } from "pixi.js";

import type { BackgroundSize } from "../../../types/pixi-background";
import { clamp } from "./pixi-background-layer.utils";

export function drawSynthwaveDelorean(delorean: Graphics, size: BackgroundSize, elapsedMs: number): void {
	const {
					width,
					height,
				}     = size;
	const sway  = Math.sin(elapsedMs / 4200) * width * 0.012;
	const bob   = (Math.sin(elapsedMs / 260) * 2.2) + (Math.sin(elapsedMs / 900) * 1.6);
	const scale = clamp(
		width / 1500,
		0.76,
		1.22,
	);

	delorean.clear();

	// Rear silhouette stays near the viewer; only road-follow sway and suspension bob are animated.
	delorean.position.set(
		(width * 0.5) + sway,
		(height * 0.84) + bob,
	);
	delorean.scale.set(scale);
	delorean.alpha = 1;

	// Main rear body wedge: the dark readable car mass and cyan outer edge.
	delorean
		.moveTo(
			-92,
			-8,
		)
		.lineTo(
			-62,
			-34,
		)
		.lineTo(
			-30,
			-48,
		)
		.lineTo(
			30,
			-48,
		)
		.lineTo(
			62,
			-34,
		)
		.lineTo(
			92,
			-8,
		)
		.lineTo(
			88,
			22,
		)
		.lineTo(
			-88,
			22,
		)
		.closePath()
		.fill({
			color: 0x03060f,
			alpha: 0.96,
		})
		.stroke({
			color: 0x00e1ff,
			alpha: 0.38,
			width: 1.6,
		});

	// Rear glass and the two square side intakes that make the time-machine silhouette identifiable.
	delorean
		.rect(
			-43,
			-40,
			86,
			22,
		)
		.fill({
			color: 0x00e1ff,
			alpha: 0.11,
		})
		.rect(
			-82,
			-38,
			28,
			34,
		)
		.fill({
			color: 0x01030a,
			alpha: 0.94,
		})
		.stroke({
			color: 0x00e1ff,
			alpha: 0.28,
			width: 1.2,
		})
		.rect(
			54,
			-38,
			28,
			34,
		)
		.fill({
			color: 0x01030a,
			alpha: 0.94,
		})
		.stroke({
			color: 0x00e1ff,
			alpha: 0.28,
			width: 1.2,
		});

	// Horizontal intake slats: the stacked rows are the important Back-to-the-Future read.
	for (const intakeX of [
		-82,
		54,
	]) {
		for (const slatY of [
			-31,
			-24,
			-17,
			-10,
		]) {
			delorean
				.rect(
					intakeX + 3,
					slatY,
					22,
					2,
				)
				.fill({
					color: 0x00e1ff,
					alpha: 0.22,
				});
		}
	}

	// Rear light bar and center glow; these are intentionally horizontal so the car reads from behind.
	delorean
		.rect(
			-76,
			-2,
			152,
			8,
		)
		.fill({
			color: 0xff315f,
			alpha: 0.7,
		})
		.rect(
			-28,
			0,
			56,
			5,
		)
		.fill({
			color: 0xffd2f6,
			alpha: 0.36,
		});

	// Lower neon accents separate the car from the road without adding foreground detail.
	delorean
		.rect(
			-82,
			10,
			36,
			5,
		)
		.fill({
			color: 0xff49ca,
			alpha: 0.54,
		})
		.rect(
			46,
			10,
			36,
			5,
		)
		.fill({
			color: 0x00e1ff,
			alpha: 0.5,
		});

	// Rear tires seen from behind: squat vertical sidewalls, not circular exhaust-pipe shapes.
	delorean
		.roundRect(
			-84,
			15,
			30,
			20,
			4,
		)
		.fill({
			color: 0x020814,
			alpha: 0.95,
		})
		.roundRect(
			54,
			15,
			30,
			20,
			4,
		)
		.fill({
			color: 0x020814,
			alpha: 0.95,
		})
		.rect(
			-78,
			22,
			18,
			7,
		)
		.fill({
			color: 0x000000,
			alpha: 0.9,
		})
		.rect(
			60,
			22,
			18,
			7,
		)
		.fill({
			color: 0x000000,
			alpha: 0.9,
		});
}
