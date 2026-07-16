// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getPixiCardTextLayout } from "./pixi-card-text-layout-model";

describe(
	"pixi card text layout model",
	() => {
		it(
			"places title and subtitle in the card metadata footer",
			() => {
				expect(getPixiCardTextLayout(
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
					false,
				)).toEqual({
					subtitle: {
						width: 80,
						x:     20,
						y:     212,
					},
					title:    {
						width: 80,
						x:     20,
						y:     168,
					},
				});
			},
		);

		it(
			"reserves subtitle space for the adult badge and clamps narrow cards",
			() => {
				expect(getPixiCardTextLayout(
					{
						column:  0,
						columns: 1,
						height:  128,
						index:   0,
						row:     0,
						width:   88,
						x:       0,
						y:       0,
					},
					true,
				)).toEqual({
					subtitle: {
						width: 40,
						x: 20,
						y:     88,
					},
					title:    {
						width: 48,
						x:     20,
						y:     44,
					},
				});
			},
		);
	},
);
