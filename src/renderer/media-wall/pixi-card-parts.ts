import {
	BlurFilter,
	Container,
	Graphics,
	Sprite,
	type Text,
	Texture,
} from "pixi.js";
import { createNeonPlaqueLabel } from "./pixi-card-neon-drawing";
import {
	createAdultBadgeText,
	createCountBadgeText,
} from "./pixi-card-status-drawing";
import {
	createTerminalText,
	TERMINAL_TEXT_LINE_COUNT,
} from "./pixi-card-terminal-drawing";
import {
	createPixiCardSubtitleText,
	createPixiCardTitleText,
} from "./pixi-card-text-drawing";

export interface PixiCardParts {
	readonly actionButton: Graphics;
	readonly adultBadgeBackground: Graphics;
	readonly adultBadgeText: Text;
	readonly background: Graphics;
	readonly borderGlow: Graphics;
	readonly borderMetalPlates: Graphics;
	readonly borderShine: Graphics;
	readonly container: Container;
	readonly countBadgeBackground: Graphics;
	readonly countBadgeText: Text;
	readonly poster: Graphics;
	readonly posterMask: Graphics;
	readonly progressTrack: Graphics;
	readonly progressValue: Graphics;
	readonly projectorBeam: Graphics;
	readonly projectorHardware: Graphics;
	readonly sidePlaqueLabel: Text;
	readonly subtitleText: Text;
	readonly terminalPanel: Graphics;
	readonly terminalTexts: readonly Text[];
	readonly thumbnailSprite: Sprite;
	readonly titleText: Text;
	readonly topPlaqueLabel: Text;
	readonly watchedPosterOverlay: Graphics;
}

// Owns the Pixi display-object tree for a pooled media-wall card. The renderer
// binds data into these parts, while this module keeps construction order,
// masks, filters, and pool-release reset rules in one place.
export function createPixiCardParts(): PixiCardParts {
	const container               = new Container();
	const borderGlowBlurFilter    = new BlurFilter({
		strength: 10,
		quality:  4,
	});
	const projectorBeamBlurFilter = new BlurFilter({
		strength: 12,
		quality:  4,
	});
	const borderGlow              = new Graphics();
	const background              = new Graphics();
	const borderShine             = new Graphics();
	const poster                  = new Graphics();
	const thumbnailSprite         = new Sprite({
		texture: Texture.EMPTY,
	});
	const posterMask              = new Graphics();
	const watchedPosterOverlay    = new Graphics();
	const actionButton            = new Graphics();
	const terminalPanel           = new Graphics();
	const terminalTexts           = Array.from(
		{ length: TERMINAL_TEXT_LINE_COUNT },
		() => createTerminalText(),
	);
	const progressTrack           = new Graphics();
	const progressValue           = new Graphics();
	const countBadgeBackground    = new Graphics();
	const countBadgeText          = createCountBadgeText();
	const adultBadgeBackground    = new Graphics();
	const adultBadgeText          = createAdultBadgeText();
	const projectorBeam           = new Graphics();
	const projectorHardware       = new Graphics();
	const borderMetalPlates       = new Graphics();
	const topPlaqueLabel          = createNeonPlaqueLabel("SEL");
	const sidePlaqueLabel         = createNeonPlaqueLabel("W");
	const titleText               = createPixiCardTitleText();
	const subtitleText            = createPixiCardSubtitleText();

	thumbnailSprite.mask            = posterMask;
	borderGlowBlurFilter.padding    = 38;
	projectorBeamBlurFilter.padding = 40;
	borderGlow.filters              = [ borderGlowBlurFilter ];
	projectorBeam.filters           = [ projectorBeamBlurFilter ];
	borderGlow.blendMode            = "add";
	projectorBeam.blendMode         = "add";
	container.addChild(
		background,
		borderShine,
		poster,
		thumbnailSprite,
		posterMask,
		watchedPosterOverlay,
		terminalPanel,
		...terminalTexts,
		actionButton,
		countBadgeBackground,
		countBadgeText,
		adultBadgeBackground,
		adultBadgeText,
		progressTrack,
		progressValue,
		titleText,
		subtitleText,
		projectorBeam,
		projectorHardware,
		borderGlow,
		borderMetalPlates,
		topPlaqueLabel,
		sidePlaqueLabel,
	);

	return {
		actionButton,
		adultBadgeBackground,
		adultBadgeText,
		background,
		borderGlow,
		borderMetalPlates,
		borderShine,
		container,
		countBadgeBackground,
		countBadgeText,
		poster,
		posterMask,
		progressTrack,
		progressValue,
		projectorBeam,
		projectorHardware,
		sidePlaqueLabel,
		subtitleText,
		terminalPanel,
		terminalTexts,
		thumbnailSprite,
		titleText,
		topPlaqueLabel,
		watchedPosterOverlay,
	};
}

export function releasePixiCardParts(parts: PixiCardParts): void {
	parts.container.visible            = false;
	parts.container.alpha              = 1;
	parts.thumbnailSprite.texture      = Texture.EMPTY;
	parts.thumbnailSprite.visible      = false;
	parts.countBadgeBackground.visible = false;
	parts.countBadgeText.visible       = false;
	parts.adultBadgeBackground.visible = false;
	parts.adultBadgeText.visible       = false;
	parts.watchedPosterOverlay.visible = false;
	parts.actionButton.visible         = false;
	parts.terminalPanel.visible        = false;
	parts.projectorBeam.visible        = false;
	parts.projectorHardware.visible    = false;
	parts.topPlaqueLabel.visible       = false;
	parts.sidePlaqueLabel.visible      = false;
	parts.terminalTexts.forEach((text) => {
		text.visible = false;
	});
}
