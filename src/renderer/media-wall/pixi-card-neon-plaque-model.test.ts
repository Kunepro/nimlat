// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getNeonPlaqueLabelLayout } from "./pixi-card-neon-plaque-model";

describe(
	"pixi card neon plaque model",
	() => {
		it(
			"centers labels inside clamp plaques on regular cards",
			() => {
				expect(getNeonPlaqueLabelLayout(
					{
						column:  0,
						columns: 1,
						height:  252,
						index:   0,
						row:     0,
						width:   120,
						x:       0,
						y:       0,
					},
					{
						height: 10,
						width:  18,
					},
					{
						height: 10,
						width:  7,
					},
				)).toEqual({
					side: {
						x: -0.5,
						y: 190,
					},
					top:  {
						x: 63,
						y: -2,
					},
				});
			},
		);

		it(
			"clamps plaque anchors on narrow or short cards",
			() => {
				expect(getNeonPlaqueLabelLayout(
					{
						column:  0,
						columns: 1,
						height:  88,
						index:   0,
						row:     0,
						width:   72,
						x:       0,
						y:       0,
					},
					{
						height: 10,
						width:  18,
					},
					{
						height: 10,
						width:  7,
					},
				)).toEqual({
					side: {
						x: -0.5,
						y: 40,
					},
					top:  {
						x: 35,
						y: -2,
					},
				});
			},
		);
	},
);
