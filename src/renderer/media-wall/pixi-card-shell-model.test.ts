// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getPixiCardShellStyle } from "./pixi-card-shell-model";

describe(
	"pixi card shell model",
	() => {
		it(
			"uses a quieter background and poster panel for placeholder cards",
			() => {
				expect(getPixiCardShellStyle(true)).toEqual({
					backgroundAlpha: 0.52,
					posterAlpha:     0.5,
					posterColor:     0x1c2541,
				});
			},
		);

		it(
			"uses the full media-card shell style for populated cards",
			() => {
				expect(getPixiCardShellStyle(false)).toEqual({
					backgroundAlpha: 0.78,
					posterAlpha:     0.85,
					posterColor:     0x232f52,
				});
			},
		);
	},
);
