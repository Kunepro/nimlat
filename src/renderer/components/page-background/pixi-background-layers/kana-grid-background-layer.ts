import {
	Container,
	Graphics,
	Text,
	TextStyle,
} from "pixi.js";
import type {
	BackgroundSize,
	PixiBackgroundDiagnostics,
	PixiBackgroundLayer,
} from "../../../types/pixi-background";

import {
	KANA_GLYPHS,
	KANA_GRID_SPARK_COLORS,
	randomGlyph,
} from "./kana-background.constants";
import {
	clamp,
	drawLine,
	randomBetween,
} from "./pixi-background-layer.utils";

const KANA_GRID_GLYPH_FONT_SIZE     = 22;
const KANA_GRID_TARGET_VISIBLE_SPACING = 34;
const KANA_GRID_OVERSCAN_CELLS      = 8;
const KANA_GRID_EDGE_OFFSET_CELLS   = 3.5;
const KANA_GRID_MIN_VISIBLE_COLUMNS = 18;
const KANA_GRID_MIN_VISIBLE_ROWS    = 12;
const KANA_GRID_MAX_VISIBLE_COLUMNS = 64;
const KANA_GRID_MAX_VISIBLE_ROWS    = 38;

interface KanaGridCellState {
	text: Text;
	baseAlpha: number;
	pulseOffset: number;
	pulseDuration: number;
	sparkStartedAt: number;
	nextSparkAt: number;
	sparkUntil: number;
	sparkColor: number;
}

interface KanaGridDimensions {
	columns: number;
	rows: number;
	visibleColumns: number;
	visibleRows: number;
}

function calculateKanaGridDimensions(size: BackgroundSize): KanaGridDimensions {
	// The glyph grid is density-based instead of fixed-size so small windows do not compress
	// 22px kana into unreadable overlap, while very large windows become airier instead of
	// allocating unbounded Pixi Text objects.
	const visibleColumns = Math.round(clamp(
		Math.ceil(size.width / KANA_GRID_TARGET_VISIBLE_SPACING),
		KANA_GRID_MIN_VISIBLE_COLUMNS,
		KANA_GRID_MAX_VISIBLE_COLUMNS,
	));
	const visibleRows    = Math.round(clamp(
		Math.ceil(size.height / KANA_GRID_TARGET_VISIBLE_SPACING),
		KANA_GRID_MIN_VISIBLE_ROWS,
		KANA_GRID_MAX_VISIBLE_ROWS,
	));

	return {
		columns: visibleColumns + KANA_GRID_OVERSCAN_CELLS,
		rows:    visibleRows + KANA_GRID_OVERSCAN_CELLS,
		visibleColumns,
		visibleRows,
	};
}

// Recreates the older DOM kana background as a Pixi layer: a density-capped glyph matrix
// with staggered cell pulses, distinct from the falling-strip Matrix-style option.
export class KanaGridBackgroundLayer implements PixiBackgroundLayer {
	private readonly root              = new Container();
	private readonly background        = new Graphics();
	private readonly grid              = new Graphics();
	private readonly scanlines         = new Graphics();
	private readonly glyphLayer        = new Container();
	private readonly glowLayer         = new Graphics();
	private size: BackgroundSize       = {
		width:  1,
		height: 1,
	};
	private cells: KanaGridCellState[] = [];
	private columns                    = 0;
	private rows                       = 0;
	private visibleColumns             = 0;
	private visibleRows                = 0;

	public constructor(stage: Container) {
		// Layer order: static wash, grid, glyphs, global glow, then scanlines over everything.
		this.root.addChild(
			this.background,
			this.grid,
			this.glyphLayer,
			this.glowLayer,
			this.scanlines,
		);
		stage.addChild(this.root);
	}

	public resize(size: BackgroundSize): void {
		this.size = size;
		this.drawStatic();
		this.rebuildGlyphs();
	}

	public update(elapsedMs: number): void {
		// Each cell has an independent slow pulse plus occasional sparks. The grid is static; only
		// alpha, tint, and glyph text change during animation.
		for (const cell of this.cells) {
			if (elapsedMs >= cell.nextSparkAt) {
				this.triggerCellSpark(
					cell,
					elapsedMs,
				);
			}
			const phase = ((elapsedMs + cell.pulseOffset) % cell.pulseDuration) / cell.pulseDuration;
			const pulse = (Math.sin(phase * Math.PI * 2) + 1) * 0.5;
			const spark = elapsedMs < cell.sparkUntil
				? 1 - ((elapsedMs - cell.sparkStartedAt) / Math.max(
				1,
				cell.sparkUntil - cell.sparkStartedAt,
			))
				: 0;

			cell.text.alpha = clamp(
				cell.baseAlpha + (pulse * 0.12) + (spark * 0.66),
				0.12,
				0.96,
			);
			cell.text.tint  = spark > 0 ? cell.sparkColor : 0x0096ff;
		}

		this.glowLayer.alpha = 0.3 + (Math.sin(elapsedMs / 1700) * 0.06);
	}

	public destroy(): void {
		this.clearGlyphs();
		this.root.parent?.removeChild(this.root);
		this.root.destroy({ children: true });
	}

	public getDiagnostics(): PixiBackgroundDiagnostics {
		return {
			layerName:   "kanaGrid",
			width:       this.size.width,
			height:      this.size.height,
			objectCount: this.cells.length,
			detail:      `columns=${ this.columns } rows=${ this.rows } visible=${ this.visibleColumns }x${ this.visibleRows }`,
		};
	}

	private drawStatic(): void {
		const {
						width,
						height,
					} = this.size;

		// Background wash: blue-black surface plus two very soft glows so the fixed kana grid
		// does not read as a flat technical overlay.
		this.background
			.clear()
			.rect(
				0,
				0,
				width,
				height,
			)
			.fill({ color: 0x030812 })
			.circle(
				width * 0.24,
				height * 0.18,
				Math.min(
					width * 0.32,
					height * 0.42,
				),
			)
			.fill({
				color: 0x00e1ff,
				alpha: 0.055,
			})
			.circle(
				width * 0.72,
				height * 0.82,
				Math.min(
					width * 0.36,
					height * 0.44,
				),
			)
			.fill({
				color: 0x5864ff,
				alpha: 0.04,
			});

		this.grid.clear();
		const gridStep = 28;
		// Fixed orthogonal cyber grid behind the glyphs; unlike kana matrix, it does not scroll.
		for (let x = 0; x <= width; x += gridStep) {
			drawLine(
				this.grid,
				x,
				0,
				x,
				height,
				0x00d1ff,
				0.08,
				1,
			);
		}
		for (let y = 0; y <= height; y += gridStep) {
			drawLine(
				this.grid,
				0,
				y,
				width,
				y,
				0x00d1ff,
				0.08,
				1,
			);
		}

		this.glowLayer
			.clear()
			.rect(
				0,
				0,
				width,
				height,
			)
			.fill({
				color: 0x001926,
				alpha: 0.22,
			});

		this.scanlines.clear();
		// Thin scanlines sit on top to reproduce the older DOM/CSS background texture.
		for (let y = 0; y < height; y += 6) {
			this.scanlines
				.rect(
					0,
					y,
					width,
					1,
				)
				.fill({
					color: 0xffffff,
					alpha: 0.026,
				});
		}
	}

	private rebuildGlyphs(): void {
		// Reuse glyph Text objects across resize when the logical cell count is unchanged; only positions
		// need recalculation because the grid stretches to the viewport within a density band.
		const dimensions  = calculateKanaGridDimensions(this.size);
		const nextColumns = dimensions.columns;
		const nextRows    = dimensions.rows;
		if (this.columns === nextColumns && this.rows === nextRows && this.cells.length > 0) {
			this.visibleColumns = dimensions.visibleColumns;
			this.visibleRows    = dimensions.visibleRows;
			this.positionGlyphs();
			return;
		}

		this.clearGlyphs();
		this.columns        = nextColumns;
		this.rows           = nextRows;
		this.visibleColumns = dimensions.visibleColumns;
		this.visibleRows    = dimensions.visibleRows;

		const glyphStyle = new TextStyle({
			fill:       0xffffff,
			fontFamily: "Yu Gothic UI, Meiryo, Noto Sans JP, Segoe UI Symbol, monospace",
			fontSize:   KANA_GRID_GLYPH_FONT_SIZE,
			fontWeight: "600",
		});

		for (let row = 0; row < this.rows; row += 1) {
			for (let column = 0; column < this.columns; column += 1) {
				// Cell timing is seeded from row/column so the light pattern feels random but stays
				// evenly distributed instead of clustering around creation order.
				const index = (row * this.columns) + column;
				const text  = new Text({
					text:  KANA_GLYPHS[ index % KANA_GLYPHS.length ] ?? randomGlyph(),
					style: glyphStyle,
				});
				text.anchor.set(
					0.5,
					0.5,
				);
				text.alpha = randomBetween(
					0.12,
					0.3,
				);
				text.tint  = Math.random() > 0.9 ? 0x64c8ff : 0x0096ff;
				this.glyphLayer.addChild(text);
				this.cells.push({
					text,
					baseAlpha:      randomBetween(
						0.16,
						0.34,
					),
					pulseOffset:    ((row * 211) + (column * 337)) % 5700,
					pulseDuration:  randomBetween(
						15200,
						29600,
					),
					nextSparkAt:    randomBetween(
						1600,
						18000,
					),
					sparkStartedAt: 0,
					sparkUntil:     0,
					sparkColor:     KANA_GRID_SPARK_COLORS[ Math.floor(Math.random() * KANA_GRID_SPARK_COLORS.length) ] ?? 0xffffff,
				});
			}
		}

		this.positionGlyphs();
	}

	private positionGlyphs(): void {
		// Overscan by several cells on every edge so resizing and fractional cell sizes do not expose gaps.
		const cellWidth  = this.size.width / Math.max(
			1,
			this.visibleColumns,
		);
		const cellHeight = this.size.height / Math.max(
			1,
			this.visibleRows,
		);
		const originX    = -cellWidth * KANA_GRID_EDGE_OFFSET_CELLS;
		const originY    = -cellHeight * KANA_GRID_EDGE_OFFSET_CELLS;

		for (let row = 0; row < this.rows; row += 1) {
			for (let column = 0; column < this.columns; column += 1) {
				const cell = this.cells[ (row * this.columns) + column ];
				if (!cell) {
					continue;
				}
				cell.text.position.set(
					originX + (column * cellWidth),
					originY + (row * cellHeight),
				);
			}
		}
	}

	private triggerCellSpark(cell: KanaGridCellState, elapsedMs: number): void {
		// Sparks briefly swap the glyph and tint, then schedule a separate future spark for that cell.
		cell.text.text      = randomGlyph();
		cell.sparkStartedAt = elapsedMs;
		cell.sparkUntil     = elapsedMs + randomBetween(
			520,
			1960,
		);
		cell.nextSparkAt    = cell.sparkUntil + randomBetween(
			4400,
			25600,
		);
		cell.sparkColor     = KANA_GRID_SPARK_COLORS[ Math.floor(Math.random() * KANA_GRID_SPARK_COLORS.length) ] ?? 0xffffff;
	}

	private clearGlyphs(): void {
		// Text objects are recreated only on logical-grid rebuilds; destroy them explicitly to release
		// Pixi text textures.
		for (const cell of this.cells) {
			cell.text.destroy();
		}
		this.cells = [];
		while (this.glyphLayer.children.length > 0) {
			this.glyphLayer.removeChild(this.glyphLayer.children[ 0 ]);
		}
	}
}
