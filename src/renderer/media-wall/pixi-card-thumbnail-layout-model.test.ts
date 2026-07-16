// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { getPixiCardThumbnailLayout } from "./pixi-card-thumbnail-layout-model";

const CARD_POSITION = {
	column:  0,
	columns: 1,
	height:  252,
	index:   0,
	row:     0,
	width:   120,
	x:       0,
	y:       0,
};

describe(
	"pixi card thumbnail layout model",
	() => {
		it(
			"center-crops tall thumbnails into the poster window",
			() => {
				expect(getPixiCardThumbnailLayout(
					CARD_POSITION,
					{
						height: 200,
						width:  100,
					},
				)).toEqual({
					alpha:  0.95,
					height: 192,
					width:  96,
					x:      12,
					y:      -14,
				});
			},
		);

		it(
			"center-crops wide thumbnails into the poster window",
			() => {
				expect(getPixiCardThumbnailLayout(
					CARD_POSITION,
					{
						height: 100,
						width:  300,
					},
				)).toEqual({
					alpha:  0.95,
					height: 140,
					width:  420,
					x:      -150,
					y:      12,
				});
			},
		);

		it(
			"rejects empty texture sizes",
			() => {
				expect(getPixiCardThumbnailLayout(
					CARD_POSITION,
					{
						height: 0,
						width:  100,
					},
				)).toBeNull();
			},
		);
	},
);
