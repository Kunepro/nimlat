import {
	Container,
	Graphics,
} from "pixi.js";

import type { BackgroundSize } from "../../../types/pixi-background";
import {
	clamp,
	drawLine,
	randomBetween,
} from "./pixi-background-layer.utils";

interface CometState {
	graphic: Graphics;
	angle: number;
	durationMs: number;
	nextLaunchAt: number;
	startX: number;
	startY: number;
	travelX: number;
	travelY: number;
	length: number;
	thickness: number;
	alpha: number;
	active: boolean;
}

// Owns the comet lifecycle so the main synthwave container only decides layer order.
export class SynthwaveComets {
	private readonly comets: CometState[] = [];
	private size: BackgroundSize          = {
		width:  1,
		height: 1,
	};

	public constructor(private readonly layer: Container) {
		this.createComets();
	}

	public get activeCount(): number {
		return this.comets.filter((comet) => comet.active).length;
	}

	public get count(): number {
		return this.comets.length;
	}

	public resize(size: BackgroundSize): void {
		this.size = size;
	}

	public update(elapsedMs: number): void {
		// Comets are sparse background events. Each pooled graphic is either waiting for launch,
		// crossing the sky, or being rescheduled after it exits.
		for (const comet of this.comets) {
			if (!comet.active && elapsedMs >= comet.nextLaunchAt) {
				this.launchComet(
					comet,
					elapsedMs,
				);
			}
			if (!comet.active) {
				comet.graphic.visible = false;
				continue;
			}

			const phase = clamp(
				(elapsedMs - comet.nextLaunchAt) / comet.durationMs,
				0,
				1,
			);
			if (phase >= 1) {
				comet.active          = false;
				comet.graphic.visible = false;
				comet.nextLaunchAt    = elapsedMs + randomBetween(
					42_000,
					110_000,
				);
				continue;
			}

			const flash           = Math.sin(phase * Math.PI);
			comet.graphic.visible = true;
			comet.graphic.alpha   = comet.alpha * flash;
			comet.graphic.position.set(
				comet.startX + (comet.travelX * phase),
				comet.startY + (comet.travelY * phase),
			);
			comet.graphic.rotation = comet.angle;
			this.drawCometShape(comet);
		}
	}

	private createComets(): void {
		// Small fixed pool: avoids allocations during animation and keeps comets rare enough not to
		// dominate the city/sun composition.
		for (let index = 0; index < 3; index += 1) {
			const graphic = new Graphics();
			this.layer.addChild(graphic);
			this.comets.push({
				graphic,
				angle:        0,
				durationMs:   1200,
				nextLaunchAt: randomBetween(
					16_000,
					54_000,
				),
				startX:       0,
				startY:       0,
				travelX:      0,
				travelY:      0,
				length:       180,
				thickness:    2,
				alpha:        0,
				active:       false,
			});
		}
	}

	private launchComet(comet: CometState, elapsedMs: number): void {
		// Launch from the upper-left-ish sky with a shallow downward angle and long duration so it reads
		// as a stylized synthwave streak rather than a fast meteor.
		const angle        = randomBetween(
			0.08,
			0.38,
		);
		const travelX      = this.size.width + randomBetween(
			220,
			620,
		);
		comet.active       = true;
		comet.nextLaunchAt = elapsedMs;
		comet.angle        = angle;
		comet.durationMs   = randomBetween(
			4_500,
			9_000,
		);
		comet.startX       = randomBetween(
			-this.size.width * 0.18,
			this.size.width * 0.12,
		);
		comet.startY       = randomBetween(
			-this.size.height * 0.08,
			this.size.height * 0.38,
		);
		comet.travelX      = travelX;
		comet.travelY      = Math.tan(angle) * travelX;
		comet.length       = randomBetween(
			320,
			720,
		);
		comet.thickness    = randomBetween(
			2.5,
			4.6,
		);
		comet.alpha        = randomBetween(
			0.32,
			0.58,
		);
		this.drawCometShape(comet);
	}

	private drawCometShape(comet: CometState): void {
		comet.graphic.clear();
		const segments = 9;
		// Tail segments fade toward the rear; alternating cyan/magenta strokes keep it visible over the sun.
		for (let segment = 0; segment < segments; segment += 1) {
			const start = -(comet.length * ((segment + 1) / segments));
			const end   = -(comet.length * (segment / segments));
			const alpha = comet.alpha * (1 - (segment / segments)) * 1.05;
			drawLine(
				comet.graphic,
				start,
				0,
				end,
				0,
				segment % 2 === 0 ? 0x00e1ff : 0xff49ca,
				alpha,
				Math.max(
					0.8,
					comet.thickness * 1.18 * (1 - (segment / (segments + 1))),
				),
			);
		}
		// Small bright head plus faint halo. The head stays subdued because the whole layer sits behind city.
		comet.graphic
			.circle(
				0,
				0,
				comet.thickness * 1.55,
			)
			.fill({
				color: 0xffffff,
				alpha: 0.72,
			})
			.circle(
				0,
				0,
				comet.thickness * 3.6,
			)
			.fill({
				color: 0x00e1ff,
				alpha: 0.11,
			});
	}
}
