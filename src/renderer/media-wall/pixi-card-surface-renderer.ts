import type { Texture } from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
} from "../types/media-wall";
import { resolveItemNeonColor } from "./pixi-card-neon-color";
import {
	drawNeonBorderMetalPlates,
	drawTurnedOffNeonBorder,
} from "./pixi-card-neon-drawing";
import { drawLitNeonGlow } from "./pixi-card-neon-glow-drawing";
import { updateNeonPlaqueLabels } from "./pixi-card-neon-plaque-drawing";
import { type PixiCardParts } from "./pixi-card-parts";
import { updateProjectorGraphics } from "./pixi-card-projector-drawing";
import { getPixiCardProjectorState } from "./pixi-card-projector-model";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";
import { drawCardShell } from "./pixi-card-shell-drawing";
import {
	drawAdultBadgeBackground,
	drawCountBadgeBackground,
	drawProgressBar,
	updateAdultBadgeText,
	updateCountBadgeText,
} from "./pixi-card-status-drawing";
import { drawActionTerminal } from "./pixi-card-terminal-drawing";
import { updatePixiCardTitleSubtitleText } from "./pixi-card-text-drawing";
import { updatePixiCardThumbnailSprite } from "./pixi-card-thumbnail-drawing";
import { updateWatchedPosterOverlay } from "./pixi-card-watched-drawing";

const FOCUSED_BORDER_COLOR = 0xf7c86b;

export interface UpdatePixiCardTextSurfacesOptions {
	readonly mapped: MediaWallItem | null;
	readonly parts: PixiCardParts;
	readonly position: MediaWallItemViewportPosition;
}

export interface UpdatePixiCardGraphicSurfacesOptions {
	readonly actionMenuTransitionStartedAt: number | null;
	readonly itemKey: string;
	readonly mapped: MediaWallItem | null;
	readonly neonIntensity: number;
	readonly nowMs: number;
	readonly parts: PixiCardParts;
	readonly position: MediaWallItemViewportPosition;
	readonly state: PixiCardRenderState;
	readonly watchedGlitchPhaseMs: number;
}

export interface UpdatePixiCardThumbnailSurfaceOptions {
	readonly parts: PixiCardParts;
	readonly position: MediaWallItemViewportPosition;
	readonly texture: Texture | null;
}

export function updatePixiCardTextSurfaces({
																						 mapped,
																						 parts,
																						 position,
																					 }: UpdatePixiCardTextSurfacesOptions): void {
	updatePixiCardTitleSubtitleText(
		parts.titleText,
		parts.subtitleText,
		mapped,
		position,
	);
	updateCountBadgeText(
		parts.countBadgeText,
		mapped,
	);
	updateAdultBadgeText(
		parts.adultBadgeText,
		mapped,
		position,
	);
}

// Routes one card render-state snapshot into all non-thumbnail Pixi surfaces.
// Keeping this outside the pooled renderer makes bind/snapshot logic separable
// from visual layer orchestration and gives future card-surface splits one seam.
export function updatePixiCardGraphicSurfaces({
																								actionMenuTransitionStartedAt,
																								itemKey,
																								mapped,
																								neonIntensity,
																								nowMs,
																								parts,
																								position,
																								state,
																								watchedGlitchPhaseMs,
																							}: UpdatePixiCardGraphicSurfacesOptions): void {
	const borderColor    = state.focused
		? FOCUSED_BORDER_COLOR
		: resolveItemNeonColor(itemKey);
	const projectorState = getPixiCardProjectorState(state);

	drawLitNeonGlow(
		parts.borderGlow,
		position,
		borderColor,
		neonIntensity,
		state.focused,
	);

	drawCardShell(
		parts.background,
		parts.poster,
		parts.posterMask,
		position,
		state.placeholder,
	);

	drawTurnedOffNeonBorder(
		parts.borderShine,
		position,
		borderColor,
		neonIntensity,
		state.focused,
	);
	drawNeonBorderMetalPlates(
		parts.borderMetalPlates,
		position,
		state.itemSelected,
		mapped?.isWatched === true,
	);
	updateNeonPlaqueLabels(
		parts.topPlaqueLabel,
		parts.sidePlaqueLabel,
		position,
	);

	updateWatchedPosterOverlay(
		parts.watchedPosterOverlay,
		position,
		mapped?.isWatched === true,
		nowMs + watchedGlitchPhaseMs,
	);

	drawActionTerminal({
		actionButton:        parts.actionButton,
		terminalPanel:       parts.terminalPanel,
		terminalTexts:       parts.terminalTexts,
		mapped,
		nowMs,
		position,
		terminalState:       state.terminalState,
		transitionStartedAt: actionMenuTransitionStartedAt,
	});

	drawProgressBar(
		parts.progressTrack,
		parts.progressValue,
		position,
		mapped?.progressPercent,
	);
	drawCountBadgeBackground(
		parts.countBadgeBackground,
		mapped,
	);
	drawAdultBadgeBackground(
		parts.adultBadgeBackground,
		mapped,
		position,
	);
	updateProjectorGraphics(
		parts.projectorBeam,
		parts.projectorHardware,
		position,
		projectorState,
	);
}

export function updatePixiCardThumbnailSurface({
																								 parts,
																								 position,
																								 texture,
																							 }: UpdatePixiCardThumbnailSurfaceOptions): void {
	updatePixiCardThumbnailSprite(
		parts.thumbnailSprite,
		texture,
		position,
	);
}
