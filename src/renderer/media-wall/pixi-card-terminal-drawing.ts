import {
	Graphics,
	Text,
	TextStyle,
} from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
	MediaWallTerminalState,
} from "../types/media-wall";
import {
	getActionButtonBounds,
	getPosterBounds,
} from "./pixi-card-geometry";
import {
	buildTerminalTextRows,
	resolveTerminalPanelTransition,
	type TerminalTextColorRole,
} from "./pixi-card-terminal-model";

export { TERMINAL_TEXT_LINE_COUNT } from "./pixi-card-terminal-model";

export const TERMINAL_GREEN_COLOR = 0x56ff91;
const TERMINAL_AMBER_COLOR        = 0xffd166;

export function createTerminalText(): Text {
	return new Text({
		text:  "",
		style: new TextStyle({
			fill:       TERMINAL_GREEN_COLOR,
			fontFamily: "JetBrains Mono, Cascadia Mono, monospace",
			fontSize:   10,
			fontWeight: "700",
			lineHeight: 12,
		}),
	});
}

function drawActionButton(graphics: Graphics, position: MediaWallItemViewportPosition, active: boolean): void {
	const bounds = getActionButtonBounds(position);
	graphics
		.clear()
		.roundRect(
			bounds.x,
			bounds.y,
			bounds.size,
			bounds.size,
			5,
		)
		.fill({
			color: active ? 0x061d15 : 0x07101d,
			alpha: 0.92,
		})
		.stroke({
			color: active ? TERMINAL_GREEN_COLOR : 0xb4eeff,
			alpha: active ? 0.86 : 0.48,
			width: 1,
		});

	for (let index = 0; index < 3; index += 1) {
		graphics
			.circle(
				bounds.x + (bounds.size / 2),
				bounds.y + 7 + index * 5,
				1.45,
			)
			.fill({
				color: active ? TERMINAL_GREEN_COLOR : 0xe8feff,
				alpha: active ? 0.96 : 0.72,
			});
	}
}

function setTerminalText(terminalTexts: readonly Text[], index: number, text: string, x: number, y: number, color: number = TERMINAL_GREEN_COLOR): void {
	const terminalText = terminalTexts[ index ];
	if (!terminalText) {
		return;
	}
	terminalText.text       = text;
	terminalText.style.fill = color;
	terminalText.position.set(
		x,
		y,
	);
	terminalText.visible = true;
}

function getTerminalTextColor(colorRole: TerminalTextColorRole): number {
	switch (colorRole) {
		case "amber":
			return TERMINAL_AMBER_COLOR;
		case "danger":
			return 0xff7a8a;
		case "disabled":
			return 0x547060;
		case "meta":
			return 0xb8ffd2;
		case "primary":
			return TERMINAL_GREEN_COLOR;
	}
}

function drawTerminalTextRows(params: {
	mapped: MediaWallItem;
	nowMs: number;
	posterY: number;
	terminalState: MediaWallTerminalState | null;
	terminalTexts: readonly Text[];
	textX: number;
}): void {
	const {
					mapped,
					nowMs,
					posterY,
					terminalState,
					terminalTexts,
					textX,
				}    = params;
	const rows = buildTerminalTextRows({
		actions: mapped.menuActions ?? [],
		meta:    mapped.menuMeta ?? [],
		nowMs,
		terminalState,
	});
	rows.forEach((row) => {
		setTerminalText(
			terminalTexts,
			row.index,
			row.text,
			textX,
			posterY + row.yOffset,
			getTerminalTextColor(row.colorRole),
		);
	});
}

export function drawActionTerminal(params: {
	actionButton: Graphics;
	terminalPanel: Graphics;
	terminalTexts: readonly Text[];
	mapped: MediaWallItem | null;
	nowMs: number;
	position: MediaWallItemViewportPosition;
	terminalState: MediaWallTerminalState | null;
	transitionStartedAt: number | null;
}): void {
	const {
					actionButton,
					terminalPanel,
					terminalTexts,
					mapped,
					nowMs,
					position,
					terminalState,
					transitionStartedAt,
				}              = params;
	const actionMenuOpen = terminalState !== null;
	drawActionButton(
		actionButton,
		position,
		actionMenuOpen,
	);
	actionButton.visible = Boolean(mapped);
	terminalTexts.forEach((text) => {
		text.visible = false;
	});

	const posterBounds       = getPosterBounds(position);
	const terminalTransition = resolveTerminalPanelTransition({
		actionMenuOpen,
		hasMappedItem: Boolean(mapped),
		nowMs,
		posterHeight:  posterBounds.height,
		posterY:       posterBounds.y,
		transitionStartedAt,
	});
	if (!mapped || terminalTransition.isHidden) {
		terminalPanel.clear();
		terminalPanel.visible = false;
		return;
	}

	terminalPanel
		.clear()
		.roundRect(
			posterBounds.x,
			terminalTransition.panelY,
			posterBounds.width,
			terminalTransition.panelHeight,
			6,
		)
		.fill({
			color: 0x020704,
			alpha: 0.96,
		})
		.stroke({
			color: TERMINAL_GREEN_COLOR,
			alpha: 0.42,
			width: 1,
		});
	terminalPanel.visible = true;
	for (let lineY = posterBounds.y + 10; lineY < posterBounds.y + posterBounds.height - 8; lineY += 13) {
		terminalPanel
			.moveTo(
				posterBounds.x + 6,
				lineY,
			)
			.lineTo(
				posterBounds.x + posterBounds.width - 6,
				lineY,
			)
			.stroke({
				color: TERMINAL_GREEN_COLOR,
				alpha: 0.045,
				width: 0.6,
			});
	}

	if (terminalTransition.isCollapsedLineOnly) {
		terminalPanel
			.moveTo(
				posterBounds.x + 12,
				posterBounds.y + (posterBounds.height / 2),
			)
			.lineTo(
				posterBounds.x + posterBounds.width - 12,
				posterBounds.y + (posterBounds.height / 2),
			)
			.stroke({
				color: TERMINAL_GREEN_COLOR,
				alpha: 0.92,
				width: 2,
			});
		return;
	}

	const textX = posterBounds.x + 12;
	drawTerminalTextRows({
		mapped,
		nowMs,
		posterY: posterBounds.y,
		terminalState,
		terminalTexts,
		textX,
	});
}
