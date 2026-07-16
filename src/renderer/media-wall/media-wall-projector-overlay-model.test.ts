// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallSize,
} from "../types/media-wall";
import { PROJECTOR_TRACKING_MENU_WIDTH } from "./media-wall-hit-testing";
import {
	resolveMediaWallProjectorOverlayItem,
	resolveMediaWallProjectorOverlayStyle,
} from "./media-wall-projector-overlay-model";

interface TestItem {
	id: string;
}

const LAYOUT: MediaWallLayout = {
	bodyHeight:             78,
	cardHeight:             223,
	cardWidth:              100,
	columns:                1,
	contentInsetBottom:     40,
	contentInsetHorizontal: 10,
	contentInsetTop:        20.6,
	gridWidth:              100,
	horizontalGap:          20,
	itemCount:              4,
	overscanRows:           1,
	posterHeight:           145,
	rowHeight:              243,
	totalHeight:            1_032,
	totalRows:              4,
	verticalGap:            20,
	viewportHeight:         600,
	viewportWidth:          320,
	xOrigin:                10.4,
};

const RANGE: MediaWallLoadedRange<TestItem> = {
	items:  [
		{ id: "media:0" },
		{ id: "media:1" },
	],
	offset: 1,
	total:  4,
};

const SIZE: MediaWallSize = {
	height: 600,
	width:  320,
};

function resolveItem(overrides: Partial<Parameters<typeof resolveMediaWallProjectorOverlayItem<TestItem>>[0]> = {}) {
	return resolveMediaWallProjectorOverlayItem({
		hasProjectorOverlayRenderer:  true,
		layout:                       LAYOUT,
		onProjectorOverlayOpenChange: vi.fn(),
		overlayScrollTop:             0,
		projectorOverlayIndex:        1,
		rangeState:                   RANGE,
		size:                         SIZE,
		...overrides,
	});
}

describe(
	"media-wall projector overlay model",
	() => {
		it(
			"does not resolve an overlay when rendering is unavailable",
			() => {
				expect(resolveItem({
					hasProjectorOverlayRenderer: false,
				})).toBeNull();
				expect(resolveItem({
					projectorOverlayIndex: null,
				})).toBeNull();
			},
		);

		it(
			"does not resolve overlays for unloaded or offscreen items",
			() => {
				expect(resolveItem({
					projectorOverlayIndex: 3,
				})).toBeNull();
				expect(resolveItem({
					size: {
						height: 200,
						width:  320,
					},
				})).toBeNull();
				expect(resolveItem({
					overlayScrollTop: 700,
				})).toBeNull();
			},
		);

		it(
			"resolves card bounds and wires overlay open changes with the active index",
			() => {
				const onProjectorOverlayOpenChange = vi.fn();
				const item                         = resolveItem({
					onProjectorOverlayOpenChange,
				});

				expect(item).toMatchObject({
					height: 223,
					index:  1,
					item:   { id: "media:0" },
					width:  100,
					x:      10.4,
					y:      263.6,
				});

				item?.onProjectorOverlayOpenChange(true);

				expect(onProjectorOverlayOpenChange).toHaveBeenCalledWith(
					1,
					true,
				);
			},
		);

		it(
			"resolves stable CSS properties from the overlay item",
			() => {
				const item = resolveItem();

				expect(resolveMediaWallProjectorOverlayStyle(item)).toEqual({
					display:                            "block",
					height:                             223,
					transform:                          "translate(10px, 264px)",
					width:                              100,
					"--projector-tracking-menu-offset": `${ item?.trackingMenuOffsetPx }px`,
					"--projector-tracking-menu-width":  `${ PROJECTOR_TRACKING_MENU_WIDTH }px`,
				});
				expect(resolveMediaWallProjectorOverlayStyle<TestItem>(null)).toBeUndefined();
			},
		);
	},
);
