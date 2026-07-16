// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getPixiCardProjectorState } from "./pixi-card-projector-model";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";

function createRenderState(overrides: Partial<PixiCardRenderState> = {}): PixiCardRenderState {
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

describe(
	"pixi card projector model",
	() => {
		it(
			"turns projector light and laser on only for projector hover with effects enabled",
			() => {
				expect(getPixiCardProjectorState(createRenderState({
					projectorHovered: true,
				}))).toEqual({
					laserIntensity: 1,
					lightIntensity: 1,
				});
			},
		);

		it(
			"keeps projector dark when effects are disabled",
			() => {
				expect(getPixiCardProjectorState(createRenderState({
					effectsEnabled:   false,
					projectorHovered: true,
				}))).toEqual({
					laserIntensity: 0,
					lightIntensity: 0,
				});
			},
		);
	},
);
