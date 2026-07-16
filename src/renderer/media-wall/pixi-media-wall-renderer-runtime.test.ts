// @vitest-environment node
import type { Application } from "pixi.js";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const pixiMock = vi.hoisted(() => {
	const stageAddChild   = vi.fn();
	const init            = vi.fn(async () => undefined);
	const ApplicationMock = vi.fn(() => ({
		canvas:  {
			style: {},
		},
		destroy: vi.fn(),
		init,
		stage:   {
			addChild: stageAddChild,
		},
	}));
	const ContainerMock   = vi.fn(() => ({}));

	return {
		ApplicationMock,
		ContainerMock,
		init,
		stageAddChild,
	};
});

vi.mock(
	"pixi.js/unsafe-eval",
	() => ({}),
);

vi.mock(
	"pixi.js",
	() => ({
		Application: pixiMock.ApplicationMock,
		Container:   pixiMock.ContainerMock,
	}),
);

const {
				attachPixiMediaWallCanvas,
				cancelMediaWallAnimationFrame,
				createPixiMediaWallApplication,
				createPixiMediaWallLayers,
				destroyPixiApplicationSafely,
			} = await import("./pixi-media-wall-renderer-runtime");

describe(
	"pixi media-wall renderer runtime",
	() => {
		afterEach(() => {
			vi.clearAllMocks();
			vi.unstubAllGlobals();
		});

		it(
			"creates the Pixi application with clamped canvas dimensions",
			async () => {
				const app = await createPixiMediaWallApplication({
					width:  0,
					height: -50,
				});

				expect(app).toBeDefined();
				expect(pixiMock.init).toHaveBeenCalledWith(expect.objectContaining({
					height: 1,
					width:  1,
				}));
			},
		);

		it(
			"creates wall and effects layers under the app stage",
			() => {
				const app = {
					stage: {
						addChild: pixiMock.stageAddChild,
					},
				} as unknown as Application;

				const layers = createPixiMediaWallLayers(app);

				expect(pixiMock.ContainerMock).toHaveBeenCalledTimes(2);
				expect(pixiMock.stageAddChild).toHaveBeenCalledWith(
					layers.wall,
					layers.effects,
				);
			},
		);

		it(
			"attaches a non-interactive full-size canvas to the host",
			() => {
				const appended: unknown[] = [];
				const container           = {
					appendChild: (child: unknown) => {
						appended.push(child);
					},
				} as unknown as HTMLElement;
				const canvas              = {
					style: {},
				} as Application["canvas"];

				attachPixiMediaWallCanvas(
					container,
					canvas,
				);

				expect(appended).toEqual([ canvas ]);
				expect(canvas.style).toMatchObject({
					display:       "block",
					height:        "100%",
					pointerEvents: "none",
					width:         "100%",
				});
			},
		);

		it(
			"cancels scheduled frames and normalizes the stored frame id",
			() => {
				const cancelAnimationFrame = vi.fn();
				vi.stubGlobal(
					"cancelAnimationFrame",
					cancelAnimationFrame,
				);

				expect(cancelMediaWallAnimationFrame(42)).toBeNull();
				expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
				expect(cancelMediaWallAnimationFrame(null)).toBeNull();
				expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"destroys Pixi applications with full resource cleanup and swallows degraded-context errors",
			() => {
				const destroy = vi.fn(() => {
					throw new Error("already destroyed");
				});
				const app     = {
					destroy,
				} as unknown as Application;

				expect(() => destroyPixiApplicationSafely(app)).not.toThrow();
				expect(destroy).toHaveBeenCalledWith(
					{ removeView: true },
					{
						children:      true,
						context:       true,
						texture:       true,
						textureSource: true,
					},
				);
				expect(() => destroyPixiApplicationSafely(null)).not.toThrow();
			},
		);
	},
);
