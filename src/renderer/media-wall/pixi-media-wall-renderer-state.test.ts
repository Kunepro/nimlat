import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallItem } from "../types/media-wall";
import { PixiMediaWallRendererState } from "./pixi-media-wall-renderer-state";

interface SourceItem {
	id: string;
	title: string;
}

function mapItem(item: SourceItem): MediaWallItem {
	return {
		id:    item.id,
		kind:  "library",
		title: item.title,
	};
}

describe(
	"PixiMediaWallRendererState",
	() => {
		it(
			"normalizes size and scroll values for Pixi renderer calls",
			() => {
				const state = new PixiMediaWallRendererState<SourceItem>();

				expect(state.setSize({
					width:  0.3,
					height: -10,
				})).toEqual({
					width:  1,
					height: 1,
				});
				state.setScrollTop(-50);

				expect(state.getSize()).toEqual({
					width:  1,
					height: 1,
				});
				expect(state.getFrameState().scrollTop).toBe(0);
			},
		);

		it(
			"copies selected indexes so caller mutations cannot leak into render state",
			() => {
				const state    = new PixiMediaWallRendererState<SourceItem>();
				const selected = new Set([ 1 ]);

				state.setSelectedIndexes(selected);
				selected.add(2);

				expect(Array.from(state.getFrameState().selectedIndexes)).toEqual([ 1 ]);
			},
		);

		it(
			"derives exiting-card targets from the currently loaded range",
			() => {
				const state = new PixiMediaWallRendererState<SourceItem>();
				state.setItems({
					offset: 10,
					total:  20,
					items:  [
						{
							id:    "media-10",
							title: "Ten",
						},
					],
				});

				state.setExitingIndex(
					10,
					mapItem,
					1234,
				);
				expect(state.getFrameState().exitingCardTarget).toEqual({
					index:       10,
					itemId:      "media-10",
					startedAtMs: 1234,
				});

				state.setExitingIndex(
					11,
					mapItem,
					5678,
				);
				expect(state.getFrameState().exitingCardTarget).toBeNull();
			},
		);
	},
);
