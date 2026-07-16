// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
} from "../types/media-wall";
import type { PixiCardParts } from "./pixi-card-parts";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";

const drawingMocks = vi.hoisted(() => ({
	drawActionTerminal:              vi.fn(),
	drawAdultBadgeBackground:        vi.fn(),
	drawCardShell:                   vi.fn(),
	drawCountBadgeBackground:        vi.fn(),
	drawLitNeonGlow:                 vi.fn(),
	drawNeonBorderMetalPlates:       vi.fn(),
	drawProgressBar:                 vi.fn(),
	drawTurnedOffNeonBorder:         vi.fn(),
	getPixiCardProjectorState:       vi.fn(() => ({
		laserIntensity: 0.75,
		lightIntensity: 0.5,
	})),
	resolveItemNeonColor:            vi.fn(() => 0x123456),
	updateAdultBadgeText:            vi.fn(),
	updateCountBadgeText:            vi.fn(),
	updateNeonPlaqueLabels:          vi.fn(),
	updatePixiCardThumbnailSprite:   vi.fn(),
	updatePixiCardTitleSubtitleText: vi.fn(),
	updateProjectorGraphics:         vi.fn(),
	updateWatchedPosterOverlay:      vi.fn(),
}));

vi.mock(
	"./pixi-card-neon-color",
	() => ({
		resolveItemNeonColor: drawingMocks.resolveItemNeonColor,
	}),
);

vi.mock(
	"./pixi-card-neon-glow-drawing",
	() => ({
		drawLitNeonGlow: drawingMocks.drawLitNeonGlow,
	}),
);

vi.mock(
	"./pixi-card-neon-drawing",
	() => ({
		drawNeonBorderMetalPlates: drawingMocks.drawNeonBorderMetalPlates,
		drawTurnedOffNeonBorder:   drawingMocks.drawTurnedOffNeonBorder,
	}),
);

vi.mock(
	"./pixi-card-neon-plaque-drawing",
	() => ({
		updateNeonPlaqueLabels: drawingMocks.updateNeonPlaqueLabels,
	}),
);

vi.mock(
	"./pixi-card-projector-drawing",
	() => ({
		updateProjectorGraphics: drawingMocks.updateProjectorGraphics,
	}),
);

vi.mock(
	"./pixi-card-projector-model",
	() => ({
		getPixiCardProjectorState: drawingMocks.getPixiCardProjectorState,
	}),
);

vi.mock(
	"./pixi-card-status-drawing",
	() => ({
		drawAdultBadgeBackground: drawingMocks.drawAdultBadgeBackground,
		drawCountBadgeBackground: drawingMocks.drawCountBadgeBackground,
		drawProgressBar:          drawingMocks.drawProgressBar,
		updateAdultBadgeText:     drawingMocks.updateAdultBadgeText,
		updateCountBadgeText:     drawingMocks.updateCountBadgeText,
	}),
);

vi.mock(
	"./pixi-card-shell-drawing",
	() => ({
		drawCardShell: drawingMocks.drawCardShell,
	}),
);

vi.mock(
	"./pixi-card-terminal-drawing",
	() => ({
		drawActionTerminal: drawingMocks.drawActionTerminal,
	}),
);

vi.mock(
	"./pixi-card-text-drawing",
	() => ({
		updatePixiCardTitleSubtitleText: drawingMocks.updatePixiCardTitleSubtitleText,
	}),
);

vi.mock(
	"./pixi-card-thumbnail-drawing",
	() => ({
		updatePixiCardThumbnailSprite: drawingMocks.updatePixiCardThumbnailSprite,
	}),
);

vi.mock(
	"./pixi-card-watched-drawing",
	() => ({
		updateWatchedPosterOverlay: drawingMocks.updateWatchedPosterOverlay,
	}),
);

const {
				updatePixiCardGraphicSurfaces,
				updatePixiCardTextSurfaces,
				updatePixiCardThumbnailSurface,
			} = await import("./pixi-card-surface-renderer");

const POSITION: MediaWallItemViewportPosition = {
	column:  1,
	columns: 3,
	height:  252,
	index:   4,
	row:     1,
	width:   120,
	x:       10,
	y:       20,
};

function createState(overrides: Partial<PixiCardRenderState> = {}): PixiCardRenderState {
	return {
		actionMenuOpen:     false,
		effectsEnabled:     true,
		exitingStartedAtMs: null,
		focused:            false,
		hovered:            false,
		itemSelected:       false,
		placeholder:        false,
		projectorHovered:   false,
		selected:           false,
		terminalState:      null,
		...overrides,
	};
}

function createParts(): PixiCardParts {
	return {
		actionButton:         { name: "actionButton" },
		adultBadgeBackground: { name: "adultBadgeBackground" },
		adultBadgeText:       { name: "adultBadgeText" },
		background:           { name: "background" },
		borderGlow:           { name: "borderGlow" },
		borderMetalPlates:    { name: "borderMetalPlates" },
		borderShine:          { name: "borderShine" },
		container:            { name: "container" },
		countBadgeBackground: { name: "countBadgeBackground" },
		countBadgeText:       { name: "countBadgeText" },
		poster:               { name: "poster" },
		posterMask:           { name: "posterMask" },
		progressTrack:        { name: "progressTrack" },
		progressValue:        { name: "progressValue" },
		projectorBeam:        { name: "projectorBeam" },
		projectorHardware:    { name: "projectorHardware" },
		sidePlaqueLabel:      { name: "sidePlaqueLabel" },
		subtitleText:         { name: "subtitleText" },
		terminalPanel:        { name: "terminalPanel" },
		terminalTexts:        [
			{ name: "terminalText:0" },
			{ name: "terminalText:1" },
		],
		thumbnailSprite:      { name: "thumbnailSprite" },
		titleText:            { name: "titleText" },
		topPlaqueLabel:       { name: "topPlaqueLabel" },
		watchedPosterOverlay: { name: "watchedPosterOverlay" },
	} as unknown as PixiCardParts;
}

function createItem(overrides: Partial<MediaWallItem> = {}): MediaWallItem {
	return {
		id:              "media:1",
		isWatched:       true,
		kind:            "library",
		menuActions:     [
			{
				id:    "watch",
				label: "Watch",
			},
		],
		mediaCount:      3,
		progressPercent: 66,
		title:           "Example",
		...overrides,
	};
}

describe(
	"pixi card surface renderer",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"routes text surfaces with the already mapped item",
			() => {
				const parts  = createParts();
				const mapped = createItem();

				updatePixiCardTextSurfaces({
					mapped,
					parts,
					position: POSITION,
				});

				expect(drawingMocks.updatePixiCardTitleSubtitleText).toHaveBeenCalledWith(
					parts.titleText,
					parts.subtitleText,
					mapped,
					POSITION,
				);
				expect(drawingMocks.updateCountBadgeText).toHaveBeenCalledWith(
					parts.countBadgeText,
					mapped,
				);
				expect(drawingMocks.updateAdultBadgeText).toHaveBeenCalledWith(
					parts.adultBadgeText,
					mapped,
					POSITION,
				);
			},
		);

		it(
			"routes graphic surfaces using neon color, projector state, and watched phase",
			() => {
				const parts         = createParts();
				const mapped        = createItem();
				const terminalState = {
					actionId:    "watch",
					index:       0,
					kind:        "running" as const,
					label:       "Watch",
					startedAtMs: 1_000,
				};
				const state         = createState({
					itemSelected: true,
					placeholder:  false,
					terminalState,
				});

				updatePixiCardGraphicSurfaces({
					actionMenuTransitionStartedAt: 750,
					itemKey:                       "media:1",
					mapped,
					neonIntensity:                 0.65,
					nowMs:                         2_000,
					parts,
					position:                      POSITION,
					state,
					watchedGlitchPhaseMs:          25,
				});

				expect(drawingMocks.resolveItemNeonColor).toHaveBeenCalledWith("media:1");
				expect(drawingMocks.drawLitNeonGlow).toHaveBeenCalledWith(
					parts.borderGlow,
					POSITION,
					0x123456,
					0.65,
					false,
				);
				expect(drawingMocks.drawCardShell).toHaveBeenCalledWith(
					parts.background,
					parts.poster,
					parts.posterMask,
					POSITION,
					false,
				);
				expect(drawingMocks.drawNeonBorderMetalPlates).toHaveBeenCalledWith(
					parts.borderMetalPlates,
					POSITION,
					true,
					true,
				);
				expect(drawingMocks.updateWatchedPosterOverlay).toHaveBeenCalledWith(
					parts.watchedPosterOverlay,
					POSITION,
					true,
					2_025,
				);
				expect(drawingMocks.drawActionTerminal).toHaveBeenCalledWith({
					actionButton:        parts.actionButton,
					mapped,
					nowMs:               2_000,
					position:            POSITION,
					terminalPanel:       parts.terminalPanel,
					terminalState,
					terminalTexts:       parts.terminalTexts,
					transitionStartedAt: 750,
				});
				expect(drawingMocks.drawProgressBar).toHaveBeenCalledWith(
					parts.progressTrack,
					parts.progressValue,
					POSITION,
					66,
				);
				expect(drawingMocks.updateProjectorGraphics).toHaveBeenCalledWith(
					parts.projectorBeam,
					parts.projectorHardware,
					POSITION,
					{
						laserIntensity: 0.75,
						lightIntensity: 0.5,
					},
				);
			},
		);

		it(
			"uses the focused border color without hashing the item key",
			() => {
				const parts = createParts();

				updatePixiCardGraphicSurfaces({
					actionMenuTransitionStartedAt: null,
					itemKey:                       "placeholder:4",
					mapped:                        null,
					neonIntensity:                 1,
					nowMs:                         100,
					parts,
					position:                      POSITION,
					state:                         createState({ focused: true }),
					watchedGlitchPhaseMs:          0,
				});

				expect(drawingMocks.resolveItemNeonColor).not.toHaveBeenCalled();
				expect(drawingMocks.drawLitNeonGlow).toHaveBeenCalledWith(
					parts.borderGlow,
					POSITION,
					0xf7c86b,
					1,
					true,
				);
			},
		);

		it(
			"routes thumbnail updates through the card thumbnail sprite",
			() => {
				const parts   = createParts();
				const texture = { id: "texture:1" };

				updatePixiCardThumbnailSurface({
					parts,
					position: POSITION,
					texture:  texture as never,
				});

				expect(drawingMocks.updatePixiCardThumbnailSprite).toHaveBeenCalledWith(
					parts.thumbnailSprite,
					texture,
					POSITION,
				);
			},
		);
	},
);
