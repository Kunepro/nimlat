// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";

import {
	createKanaMatrixGlyphSequence,
	KANA_MATRIX_HIDDEN_MESSAGES,
} from "./kana-matrix-hidden-messages";

function createRandomSequence(values: readonly number[]): () => number {
	let index = 0;
	return () => {
		const value = values[ index ] ?? 0;
		index += 1;
		return value;
	};
}

describe(
	"kana matrix hidden messages",
	() => {
		it(
			"keeps the strip random when the hidden-message roll does not pass",
			() => {
				const glyphCount  = 80;
				const randomValue = createRandomSequence([
					...Array<number>(glyphCount).fill(0),
					0.99,
				]);

				expect(createKanaMatrixGlyphSequence(
					glyphCount,
					randomValue,
				)).toEqual(Array<string>(glyphCount).fill("ア"));
			},
		);

		it(
			"embeds one complete message at the selected position",
			() => {
				const glyphCount     = 80;
				const longestMessage = KANA_MATRIX_HIDDEN_MESSAGES.at(-1);
				const randomValue    = createRandomSequence([
					...Array<number>(glyphCount).fill(0),
					0,
					0.99,
					0.99,
				]);

				const glyphs = createKanaMatrixGlyphSequence(
					glyphCount,
					randomValue,
				);

				expect(longestMessage).toBeDefined();
				expect(glyphs.join("")).toContain(longestMessage);
				expect(glyphs).toHaveLength(glyphCount);
			},
		);

		it(
			"does not insert a partial message into a short strip",
			() => {
				const glyphCount = Math.min(...KANA_MATRIX_HIDDEN_MESSAGES.map((message) => message.length)) - 1;

				expect(createKanaMatrixGlyphSequence(
					glyphCount,
					() => 0,
				)).toEqual(Array<string>(glyphCount).fill("ア"));
			},
		);
	},
);
