import {
	Application,
	Container,
	Graphics,
	Rectangle,
	Sprite,
	Text,
	TextStyle,
	Texture,
} from "pixi.js";
import type {
	BackgroundSize,
	PixiBackgroundDiagnostics,
	PixiBackgroundLayer,
} from "../../../types/pixi-background";

import {
	KANA_MATRIX_HORIZONTAL_OVERSCAN,
	KANA_MATRIX_LOGICAL_WIDTH,
} from "./kana-background.constants";
import { createKanaMatrixGlyphSequence } from "./kana-matrix-hidden-messages";
import {
	clamp,
	randomBetween,
} from "./pixi-background-layer.utils";

interface KanaStripState {
	sprite: Sprite;
	texture: Texture;
	x: number;
	speed: number;
	regenerateAt: number;
}

export class KanaMatrixBackgroundLayer implements PixiBackgroundLayer {
	private readonly root            = new Container();
	private readonly background      = new Graphics();
	private readonly stripLayer      = new Container();
	private readonly glowLayer       = new Graphics();
	private readonly app: Application;
	private size: BackgroundSize     = {
		width:  1,
		height: 1,
	};
	private strips: KanaStripState[] = [];
	private stripLogicalColumnCount  = 0;
	private stripHeightBucket        = 0;

	public constructor(app: Application, stage: Container) {
		this.app = app;
		// Layer order: base darkness, falling pre-rendered kana strips, then the subtle global glow.
		this.root.addChild(
			this.background,
			this.stripLayer,
			this.glowLayer,
		);
		stage.addChild(this.root);
	}

	public resize(size: BackgroundSize): void {
		this.size = size;
		this.drawBackground();
		this.rebuildStripsIfNeeded();
	}

	public update(elapsedMs: number, deltaMs: number): void {
		const deltaSeconds = deltaMs / 1000;
		// Strip sprites are recycled instead of recreated every frame; regeneration only happens
		// when a strip leaves the viewport or has lived long enough to keep the texture pattern varied.
		for (const strip of this.strips) {
			strip.sprite.y += strip.speed * deltaSeconds;

			if (strip.sprite.y > this.size.height + 40 || elapsedMs > strip.regenerateAt) {
				this.regenerateStrip(
					strip,
					elapsedMs,
				);
				strip.sprite.y = randomBetween(
					-this.size.height * 1.1,
					-80,
				);
			}
		}

		this.glowLayer.alpha = 0.52 + (Math.sin(elapsedMs / 2400) * 0.14);
	}

	public destroy(): void {
		this.clearStrips();
		this.root.parent?.removeChild(this.root);
		this.root.destroy({ children: true });
	}

	public getDiagnostics(): PixiBackgroundDiagnostics {
		return {
			layerName:   "kanaMatrix",
			width:       this.size.width,
			height:      this.size.height,
			objectCount: this.strips.length,
			detail:      `scaleX=${ this.stripLayer.scale.x.toFixed(2) } columns=${ this.stripLogicalColumnCount } heightBucket=${ this.stripHeightBucket }`,
		};
	}

	private drawBackground(): void {
		const {
						width,
						height,
					} = this.size;
		// Static base wash: deep green-black plus a transparent tint that supports the strip glow.
		this.background
			.clear()
			.rect(
				0,
				0,
				width,
				height,
			)
			.fill({ color: 0x02070b })
			.rect(
				0,
				0,
				width,
				height,
			)
			.fill({
				color: 0x00111a,
				alpha: 0.08,
			});

		this.glowLayer
			.clear()
			.rect(
				0,
				0,
				width,
				height,
			)
			.fill({
				color: 0x00111a,
				alpha: 0.18,
			});
	}

	private rebuildStripsIfNeeded(): void {
		// Width is capped to avoid making ultrawide screens pay for more glyph columns; the strip layer
		// is scaled horizontally so the effect still covers the full viewport.
		const logicalWidth     = Math.min(
			this.size.width,
			KANA_MATRIX_LOGICAL_WIDTH,
		);
		const columnWidth      = 24;
		const nextColumnCount  = clamp(
			Math.ceil(logicalWidth / columnWidth) + 8,
			28,
			96,
		);
		const nextHeightBucket = Math.ceil(this.size.height / 160);
		this.positionStripLayer(logicalWidth);
		if (
			this.strips.length > 0
			&& this.stripLogicalColumnCount === nextColumnCount
			&& this.stripHeightBucket === nextHeightBucket
		) {
			return;
		}

		this.rebuildStrips(
			logicalWidth,
			columnWidth,
			nextColumnCount,
			nextHeightBucket,
		);
	}

	private rebuildStrips(logicalWidth: number, columnWidth: number, stripCount: number, heightBucket: number): void {
		this.clearStrips();
		this.stripLogicalColumnCount = stripCount;
		this.stripHeightBucket       = heightBucket;
		this.positionStripLayer(logicalWidth);

		for (let index = 0; index < stripCount; index += 1) {
			// Each visible column is a sprite backed by one generated texture, which is cheaper
			// than animating hundreds of Text objects independently.
			const x       = ((index - 4) * columnWidth) + randomBetween(
				-6,
				6,
			);
			const texture = this.createStripTexture(columnWidth);
			const sprite  = new Sprite({ texture });
			sprite.position.set(
				x,
				randomBetween(
					-this.size.height,
					this.size.height,
				),
			);
			sprite.alpha = randomBetween(
				0.22,
				0.72,
			);

			this.stripLayer.addChild(sprite);
			this.strips.push({
				sprite,
				texture,
				x,
				speed:        randomBetween(
					18,
					96,
				),
				regenerateAt: randomBetween(
					5000,
					16000,
				),
			});
		}
	}

	private positionStripLayer(logicalWidth: number): void {
		// Overscan avoids a visible empty edge while the logical-width cap keeps resize cost bounded.
		const coveredWidth         = this.size.width + KANA_MATRIX_HORIZONTAL_OVERSCAN;
		this.stripLayer.position.x = -(KANA_MATRIX_HORIZONTAL_OVERSCAN * 0.25);
		this.stripLayer.scale.x    = coveredWidth / logicalWidth;
	}

	private regenerateStrip(strip: KanaStripState, elapsedMs: number): void {
		// Replace the texture explicitly before destroying the old one so Pixi never keeps a sprite
		// pointing at a disposed GPU resource.
		const nextTexture    = this.createStripTexture(Math.max(
			18,
			strip.texture.width,
		));
		strip.sprite.texture = Texture.EMPTY;
		strip.texture.destroy(true);
		strip.texture        = nextTexture;
		strip.sprite.texture = nextTexture;
		strip.sprite.x       = strip.x + randomBetween(
			-4,
			4,
		);
		strip.sprite.alpha   = randomBetween(
			0.22,
			0.74,
		);
		strip.speed          = randomBetween(
			18,
			108,
		);
		strip.regenerateAt   = elapsedMs + randomBetween(
			5000,
			18000,
		);
	}

	private createStripTexture(width: number): Texture {
		// Build the whole falling column off-screen and flatten it to a texture. This keeps the runtime
		// animation to sprite movement while preserving irregular glyph spacing and alpha variation.
		const stripHeight = Math.max(
			this.size.height * randomBetween(
				1.1,
				1.9,
			),
			480,
		);
		const glyphSize   = randomBetween(
			14,
			22,
		);
		const rowHeight   = glyphSize * randomBetween(
			1.08,
			1.44,
		);
		const glyphCount  = Math.ceil(stripHeight / rowHeight);
		const glyphs = createKanaMatrixGlyphSequence(glyphCount);
		const container   = new Container();
		const style       = new TextStyle({
			fill:       0x7fffd4,
			fontFamily: "Yu Gothic UI, Meiryo, Segoe UI Symbol, sans-serif",
			fontSize:   glyphSize,
			fontWeight: Math.random() > 0.74 ? "700" : "400",
		});

		for (let index = 0; index < glyphCount; index += 1) {
			const text = new Text({
				text: glyphs[ index ] ?? "ア",
				style,
			});
			text.position.set(
				randomBetween(
					0,
					Math.max(
						1,
						width - glyphSize,
					),
				),
				index * rowHeight,
			);
			text.alpha = index === 0
				? randomBetween(
					0.78,
					1,
				)
				: randomBetween(
					0.18,
					0.72,
				);
			container.addChild(text);
		}

		const texture = this.app.renderer.generateTexture({
			target:     container,
			frame:      new Rectangle(
				0,
				0,
				width,
				stripHeight,
			),
			resolution: 1,
		});
		container.destroy({
			children: true,
		});
		return texture;
	}

	private clearStrips(): void {
		// Detach the complete owned layer first, then release both sprites and generated textures.
		this.stripLayer.removeChildren();
		for (const strip of this.strips) {
			strip.sprite.texture = Texture.EMPTY;
			strip.sprite.destroy();
			strip.texture.destroy(true);
		}
		this.strips = [];
	}
}
