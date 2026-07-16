// @vitest-environment jsdom
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	getVisualScrollbarThumbTop,
	updateVisualScrollbarPosition,
} from "./media-wall-host.utils";
import { calculateMediaWallLayout } from "./media-wall-layout";

describe(
	"media-wall host utilities",
	() => {
		it(
			"keeps the visual scrollbar rail fixed while moving only the thumb",
			() => {
				const layout         = calculateMediaWallLayout({
					viewportWidth:  900,
					viewportHeight: 600,
					itemCount:      500,
				});
				const size           = {
					width:  900,
					height: 600,
				};
				const scrollTop      = 320;
				const rail           = document.createElement("div");
				const thumb          = document.createElement("div");
				rail.style.transform = "translateY(320px)";

				updateVisualScrollbarPosition(
					scrollTop,
					layout,
					size,
					rail,
					thumb,
				);

				expect(rail.style.transform).toBe("");
				expect(thumb.style.transform).toBe(`translateY(${ getVisualScrollbarThumbTop(
					layout,
					size,
					scrollTop,
				) }px)`);
			},
		);
	},
);
