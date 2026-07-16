import {
	Text,
	TextStyle,
} from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
} from "../types/media-wall";
import { truncateCanvasTitleToTwoLines } from "./pixi-card-text";
import { getPixiCardTextLayout } from "./pixi-card-text-layout-model";

const DEFAULT_TEXT_COLOR = 0xf5f7ff;
const MUTED_TEXT_COLOR   = 0xaab3d9;
const TITLE_FONT_FAMILY  = "Inter, Segoe UI, sans-serif";

export function createPixiCardTitleText(): Text {
	return new Text({
		text:  "",
		style: new TextStyle({
			fill:       DEFAULT_TEXT_COLOR,
			fontFamily: TITLE_FONT_FAMILY,
			fontSize:   14,
			fontWeight: "600",
			lineHeight: 18,
			wordWrap:   true,
		}),
	});
}

export function createPixiCardSubtitleText(): Text {
	return new Text({
		text:  "",
		style: new TextStyle({
			fill:       MUTED_TEXT_COLOR,
			fontFamily: TITLE_FONT_FAMILY,
			fontSize:   12,
			lineHeight: 16,
			wordWrap:   true,
		}),
	});
}

export function updatePixiCardTitleSubtitleText(
	titleText: Text,
	subtitleText: Text,
	mapped: MediaWallItem | null,
	position: MediaWallItemViewportPosition,
): void {
	const layout = getPixiCardTextLayout(
		position,
		Boolean(mapped?.isAdult),
	);

	titleText.style.wordWrapWidth = layout.title.width;
	titleText.text                = truncateCanvasTitleToTwoLines(
		mapped?.title || "Loading",
		titleText.style,
	);
	titleText.position.set(
		layout.title.x,
		layout.title.y,
	);

	subtitleText.text                = mapped?.subtitle || "";
	subtitleText.style.wordWrapWidth = layout.subtitle.width;
	subtitleText.position.set(
		layout.subtitle.x,
		layout.subtitle.y,
	);
}
