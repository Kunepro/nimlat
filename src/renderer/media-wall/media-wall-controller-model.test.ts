import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallLoadedRange } from "../types/media-wall";
import {
	resolveActiveMediaWallAriaLabel,
	resolveActiveMediaWallIndex,
	resolveMediaWallSpacerHeight,
} from "./media-wall-controller-model";
import { calculateMediaWallLayout } from "./media-wall-layout";

describe(
	"media-wall-controller-model",
	() => {
		it(
			"resolves active index using menu, hover, focus, then selection priority",
			() => {
				expect(resolveActiveMediaWallIndex({
					actionMenuOpenIndex: 4,
					hoveredIndex:        3,
					focusedIndex:        2,
					selectedIndex:       1,
				})).toBe(4);
				expect(resolveActiveMediaWallIndex({
					actionMenuOpenIndex: null,
					hoveredIndex:        3,
					focusedIndex:        2,
					selectedIndex:       1,
				})).toBe(3);
				expect(resolveActiveMediaWallIndex({
					actionMenuOpenIndex: null,
					hoveredIndex:        null,
					focusedIndex:        null,
					selectedIndex:       1,
				})).toBe(1);
				expect(resolveActiveMediaWallIndex({
					actionMenuOpenIndex: null,
					hoveredIndex:        null,
					focusedIndex:        null,
					selectedIndex:       null,
				})).toBeNull();
			},
		);

		it(
			"resolves active aria labels only for loaded range items",
			() => {
				const rangeState: MediaWallLoadedRange<{ name: string }> = {
					offset: 10,
					total:  40,
					items:  [
						{ name: "A" },
						{ name: "B" },
					],
				};

				expect(resolveActiveMediaWallAriaLabel({
					activeIndex:      11,
					getItemAriaLabel: item => `item ${ item.name }`,
					rangeState,
				})).toBe("item B");
				expect(resolveActiveMediaWallAriaLabel({
					activeIndex:      9,
					getItemAriaLabel: item => `item ${ item.name }`,
					rangeState,
				})).toBe("");
				expect(resolveActiveMediaWallAriaLabel({
					activeIndex: 11,
					rangeState,
				})).toBe("");
			},
		);

		it(
			"keeps virtual spacer height non-negative",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      200,
				});

				expect(resolveMediaWallSpacerHeight(
					layout,
					800,
				)).toBe(layout.totalHeight - 800);
				expect(resolveMediaWallSpacerHeight(
					{
						...layout,
						totalHeight: 200,
					},
					800,
				)).toBe(0);
			},
		);
	},
);
