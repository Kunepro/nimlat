// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getPixiCardLitNeonGlowStyle } from "./pixi-card-neon-glow-model";

describe(
	"pixi card neon glow model",
	() => {
		it(
			"turns the active glow off when neon intensity is zero",
			() => {
				expect(getPixiCardLitNeonGlowStyle(
					0,
					false,
				)).toEqual({
					coreBloomAlpha:      0,
					coreWidth:           2,
					glassHighlightAlpha: 0.07,
					innerTubeBloomAlpha: 0,
					outerBloomAlpha:     0,
					sideBloomAlpha:      0,
					tallBloomAlpha:      0,
					visible:             false,
					wideBloomAlpha:      0,
				});
			},
		);

		it(
			"keeps the unfocused glow brighter than the focused glow at the same intensity",
			() => {
				const focusedStyle   = getPixiCardLitNeonGlowStyle(
					1,
					true,
				);
				const unfocusedStyle = getPixiCardLitNeonGlowStyle(
					1,
					false,
				);

				expect(focusedStyle).toMatchObject({
					coreWidth:           16,
					glassHighlightAlpha: 0.26,
					innerTubeBloomAlpha: 0.18,
					outerBloomAlpha:     0.08,
					sideBloomAlpha:      0.062,
					tallBloomAlpha:      0.038,
					visible:             true,
					wideBloomAlpha:      0.052,
				});
				expect(focusedStyle.coreBloomAlpha).toBeCloseTo(0.575 * 0.76);
				expect(unfocusedStyle.coreBloomAlpha).toBeCloseTo(0.655 * 0.76);
				expect(unfocusedStyle.coreBloomAlpha).toBeGreaterThan(focusedStyle.coreBloomAlpha);
			},
		);
	},
);
