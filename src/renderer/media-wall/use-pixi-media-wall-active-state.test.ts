// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallLoadedRange } from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { createPixiMediaWallActiveState } from "./use-pixi-media-wall-active-state";

describe(
	"pixi media-wall active state",
	() => {
		it(
			"derives the active card, accessible label, and virtual spacer together",
			() => {
				const layout                                              = calculateMediaWallLayout({
					viewportWidth:  1280,
					viewportHeight: 720,
					itemCount:      100,
				});
				const rangeState: MediaWallLoadedRange<{ title: string }> = {
					offset: 20,
					total:  100,
					items:  [
						{ title: "First" },
						{ title: "Second" },
					],
				};

				const activeState = createPixiMediaWallActiveState({
					actionMenuOpenIndex: null,
					focusedIndex:        20,
					getItemAriaLabel:    item => item.title,
					hoveredIndex:        21,
					layout,
					rangeState,
					selectedIndex:       22,
					viewportHeight:      720,
				});

				expect(activeState).toEqual({
					activeAriaLabel: "Second",
					activeIndex:     21,
					spacerHeight:    layout.totalHeight - 720,
				});
			},
		);

		it(
			"keeps the active state empty when the chosen index is outside the loaded range",
			() => {
				const layout                                              = {
					...calculateMediaWallLayout({
						viewportWidth:  800,
						viewportHeight: 480,
						itemCount:      1,
					}),
					totalHeight: 200,
				};
				const rangeState: MediaWallLoadedRange<{ title: string }> = {
					offset: 0,
					total:  1,
					items:  [ { title: "Only" } ],
				};

				const activeState = createPixiMediaWallActiveState({
					actionMenuOpenIndex: null,
					focusedIndex:        null,
					getItemAriaLabel:    item => item.title,
					hoveredIndex:        null,
					layout,
					rangeState,
					selectedIndex:       3,
					viewportHeight:      480,
				});

				expect(activeState).toEqual({
					activeAriaLabel: "",
					activeIndex:     3,
					spacerHeight:    0,
				});
			},
		);
	},
);
