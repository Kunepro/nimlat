// @vitest-environment node
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { PixiMediaWallCardAnimationScheduler } from "./pixi-media-wall-card-animation-scheduler";

describe(
	"PixiMediaWallCardAnimationScheduler",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
		});

		it(
			"does nothing when no card animation is active",
			() => {
				const render                = vi.fn();
				const requestAnimationFrame = vi.fn();
				vi.stubGlobal(
					"requestAnimationFrame",
					requestAnimationFrame,
				);
				const scheduler = new PixiMediaWallCardAnimationScheduler({ render });

				scheduler.requestNextFrame(false);

				expect(requestAnimationFrame).not.toHaveBeenCalled();
				expect(render).not.toHaveBeenCalled();
			},
		);

		it(
			"renders immediately when requestAnimationFrame is unavailable",
			() => {
				Reflect.deleteProperty(
					globalThis,
					"requestAnimationFrame",
				);
				const render    = vi.fn();
				const scheduler = new PixiMediaWallCardAnimationScheduler({ render });

				scheduler.requestNextFrame(true);

				expect(render).toHaveBeenCalledOnce();
			},
		);

		it(
			"dedupes scheduled animation frames until the frame callback runs",
			() => {
				const callbacks: FrameRequestCallback[] = [];
				const requestAnimationFrame             = vi.fn((callback: FrameRequestCallback) => {
					callbacks.push(callback);
					return callbacks.length;
				});
				vi.stubGlobal(
					"requestAnimationFrame",
					requestAnimationFrame,
				);
				const render    = vi.fn();
				const scheduler = new PixiMediaWallCardAnimationScheduler({ render });

				scheduler.requestNextFrame(true);
				scheduler.requestNextFrame(true);

				expect(requestAnimationFrame).toHaveBeenCalledOnce();
				expect(render).not.toHaveBeenCalled();

				callbacks[ 0 ]?.(100);

				expect(render).toHaveBeenCalledOnce();

				scheduler.requestNextFrame(true);

				expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"cancels a scheduled animation frame",
			() => {
				const requestAnimationFrame = vi.fn(() => 42);
				const cancelAnimationFrame  = vi.fn();
				vi.stubGlobal(
					"requestAnimationFrame",
					requestAnimationFrame,
				);
				vi.stubGlobal(
					"cancelAnimationFrame",
					cancelAnimationFrame,
				);
				const scheduler = new PixiMediaWallCardAnimationScheduler({ render: vi.fn() });

				scheduler.requestNextFrame(true);
				scheduler.cancel();
				scheduler.cancel();

				expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
				expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
			},
		);
	},
);
