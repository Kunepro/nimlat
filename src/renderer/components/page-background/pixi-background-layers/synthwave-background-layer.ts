import {
	Container,
	Graphics,
} from "pixi.js";
import type {
	BackgroundSize,
	PixiBackgroundDiagnostics,
	PixiBackgroundLayer,
} from "../../../types/pixi-background";
import {
	clamp,
	randomBetween,
} from "./pixi-background-layer.utils";
import {
	drawSynthwaveBeams,
	drawSynthwaveDelorean,
	drawSynthwaveGrid,
	drawSynthwaveNightCity,
	drawSynthwavePassingPalms,
	drawSynthwaveRefreshBand,
	drawSynthwaveRoad,
	drawSynthwaveStatic,
} from "./synthwave-background-drawers";

import { SynthwaveComets } from "./synthwave-comets";

export class SynthwaveBackgroundLayer implements PixiBackgroundLayer {
	private readonly root        = new Container();
	private readonly sky         = new Graphics();
	private readonly sun         = new Graphics();
	private readonly cometLayer  = new Container();
	private readonly skyline     = new Graphics();
	private readonly horizon     = new Graphics();
	private readonly beams       = new Graphics();
	private readonly road        = new Graphics();
	private readonly grid        = new Graphics();
	private readonly palms       = new Container();
	private readonly delorean    = new Graphics();
	private readonly scanlines   = new Graphics();
	private readonly refreshBand = new Graphics();
	private readonly comets      = new SynthwaveComets(this.cometLayer);
	private nextSunFlashAt       = randomBetween(
		36_000,
		62_000,
	);
	private sunFlashStartedAt    = -10_000;
	private sunFlashDurationMs   = 0;
	private size: BackgroundSize = {
		width:  1,
		height: 1,
	};

	public constructor(stage: Container) {
		// Visual stack from far to near: sky/sun, background comets, beams/city, horizon mask,
		// full-width grid, road-side silhouettes, the car, then screen-space scan/refresh effects.
		this.root.addChild(
			this.sky,
			this.sun,
			this.cometLayer,
			this.beams,
			this.skyline,
			this.horizon,
			this.grid,
			this.road,
			this.palms,
			this.delorean,
			this.scanlines,
			this.refreshBand,
		);
		stage.addChild(this.root);
	}

	public resize(size: BackgroundSize): void {
		this.size = size;
		this.comets.resize(size);
		drawSynthwaveStatic(
			{
				horizon:   this.horizon,
				scanlines: this.scanlines,
				sky:       this.sky,
				skyline:   this.skyline,
				sun:       this.sun,
			},
			size,
		);
	}

	public update(elapsedMs: number): void {
		// Sun animation is owned here because it affects the persistent sun container transform;
		// individual transient drawing effects live in focused drawer modules.
		const pulse       = (Math.sin((elapsedMs / 30_000) * Math.PI * 2 - (Math.PI / 2)) + 1) * 0.5;
		const flash       = this.resolveSunFlash(elapsedMs);
		const sunStrength = clamp(
			pulse + flash,
			0,
			1.32,
		);
		this.sun.alpha    = 0.58 + (sunStrength * 0.34);
		this.sun.scale.set(0.99 + (sunStrength * 0.035));
		this.skyline.alpha = 1;

		drawSynthwaveBeams(
			this.beams,
			this.size,
			elapsedMs,
		);
		drawSynthwaveNightCity(
			this.skyline,
			this.size,
			elapsedMs,
		);
		drawSynthwaveRoad(
			this.road,
			this.size,
			elapsedMs,
		);
		drawSynthwaveGrid(
			this.grid,
			this.size,
			(elapsedMs / 34) % 34,
		);
		drawSynthwavePassingPalms(
			this.palms,
			this.size,
			elapsedMs,
		);
		drawSynthwaveDelorean(
			this.delorean,
			this.size,
			elapsedMs,
		);
		drawSynthwaveRefreshBand(
			this.refreshBand,
			this.size,
			elapsedMs,
		);
		this.comets.update(elapsedMs);
	}

	public getDiagnostics(): PixiBackgroundDiagnostics {
		return {
			layerName:   "synthwave",
			width:       this.size.width,
			height:      this.size.height,
			objectCount: this.root.children.length + this.comets.count,
			detail:      `comets=${ this.comets.activeCount }/${ this.comets.count }`,
		};
	}

	public destroy(): void {
		this.root.parent?.removeChild(this.root);
		this.root.destroy({ children: true });
	}

	private resolveSunFlash(elapsedMs: number): number {
		// Long pulse is predictable, but the occasional flash has irregular duty-cycle segments so the
		// red horizon sun feels electronic instead of like a simple sine wave.
		if (elapsedMs >= this.nextSunFlashAt) {
			this.sunFlashStartedAt  = elapsedMs;
			this.sunFlashDurationMs = randomBetween(
				360,
				1150,
			);
			this.nextSunFlashAt     = elapsedMs + randomBetween(
				42_000,
				68_000,
			);
		}

		const flashAge = elapsedMs - this.sunFlashStartedAt;
		if (flashAge < 0 || flashAge > this.sunFlashDurationMs) {
			return 0;
		}

		const flashPhase       = flashAge / Math.max(
			1,
			this.sunFlashDurationMs,
		);
		const irregularFlicker = flashPhase < 0.22 || (flashPhase > 0.38 && flashPhase < 0.5) || flashPhase > 0.72
			? 1
			: 0.45;
		return Math.sin(flashPhase * Math.PI) * irregularFlicker * 0.56;
	}
}
