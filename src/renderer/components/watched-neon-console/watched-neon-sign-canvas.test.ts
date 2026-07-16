import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { drawWatchedSign } from "./watched-neon-sign-canvas";

function createCanvasDouble(context: CanvasRenderingContext2D | null) {
	return {
		width:      0,
		height:     0,
		getContext: vi.fn(() => context),
	} as unknown as HTMLCanvasElement;
}

function createContextDouble() {
	return {
		save:         vi.fn(),
		restore:      vi.fn(),
		setTransform: vi.fn(),
		clearRect:    vi.fn(),
		measureText:  vi.fn(() => ({ width: 80 })),
		fillText:     vi.fn(),
		textAlign:    "start",
		textBaseline: "alphabetic",
		font:         "",
		shadowColor:  "",
		shadowBlur:   0,
		globalAlpha:  1,
		fillStyle:    "",
	} as unknown as CanvasRenderingContext2D;
}

describe(
	"watched neon sign canvas",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"resizes the backing canvas for the device pixel ratio",
			() => {
				vi.stubGlobal(
					"window",
					{ devicePixelRatio: 2 },
				);
				const context = createContextDouble();
				const canvas  = createCanvasDouble(context);

				drawWatchedSign(
					canvas,
					false,
					0,
				);

				expect(canvas.width).toBe(224);
				expect(canvas.height).toBe(48);
				expect(context.setTransform).toHaveBeenCalledWith(
					2,
					0,
					0,
					2,
					0,
					0,
				);
				expect(context.clearRect).toHaveBeenCalledWith(
					0,
					0,
					112,
					24,
				);
			},
		);

		it(
			"draws the unlit fallback text when the cable is disconnected",
			() => {
				vi.stubGlobal(
					"window",
					{ devicePixelRatio: 1 },
				);
				const context = createContextDouble();
				const canvas  = createCanvasDouble(context);

				drawWatchedSign(
					canvas,
					false,
					0,
				);

				expect(context.fillText).toHaveBeenCalledWith(
					"WATCHED",
					56,
					12.5,
				);
			},
		);

		it(
			"skips drawing when a canvas context is unavailable",
			() => {
				vi.stubGlobal(
					"window",
					{ devicePixelRatio: 1 },
				);
				const canvas = createCanvasDouble(null);

				expect(() => {
					drawWatchedSign(
						canvas,
						true,
						0,
					);
				}).not.toThrow();
			},
		);
	},
);
