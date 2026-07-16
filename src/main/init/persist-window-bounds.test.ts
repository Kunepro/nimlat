// @vitest-environment node
import type { BrowserWindow } from "electron";
import { EventEmitter } from "node:events";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const setWindowBounds = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config: {
				setWindowBounds,
			},
		},
	}),
);

type TestBounds = {
	height: number;
	width: number;
	x: number;
	y: number;
};

class TestBrowserWindow extends EventEmitter {
	public bounds: TestBounds = {
		height: 480,
		width:  800,
		x:      10,
		y:      20,
	};

	public maximized = false;

	public normalBounds: TestBounds = {
		height: 700,
		width:  1_100,
		x:      30,
		y:      40,
	};

	public getBounds(): TestBounds {
		return this.bounds;
	}

	public getNormalBounds(): TestBounds {
		return this.normalBounds;
	}

	public isMaximized(): boolean {
		return this.maximized;
	}
}

function registerTestWindow(win: TestBrowserWindow): Promise<void> {
	return import("./persist-window-bounds").then(({ registerWindowBoundsPersistence }) => {
		registerWindowBoundsPersistence(win as unknown as BrowserWindow);
	});
}

describe(
	"persist-window-bounds",
	() => {
		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
			vi.clearAllMocks();
			vi.resetModules();
		});

		it(
			"debounces noisy move and resize persistence",
			async () => {
				vi.useFakeTimers();
				const win = new TestBrowserWindow();

				await registerTestWindow(win);

				win.emit("resize");
				win.emit("move");

				await vi.advanceTimersByTimeAsync(249);

				expect(setWindowBounds).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(1);

				expect(setWindowBounds).toHaveBeenCalledTimes(1);
				expect(setWindowBounds).toHaveBeenCalledWith({
					...win.bounds,
					isMaximized: false,
				});
			},
		);

		it(
			"persists normal bounds immediately when the window is maximized",
			async () => {
				const win     = new TestBrowserWindow();
				win.maximized = true;

				await registerTestWindow(win);

				win.emit("maximize");

				expect(setWindowBounds).toHaveBeenCalledTimes(1);
				expect(setWindowBounds).toHaveBeenCalledWith({
					...win.normalBounds,
					isMaximized: true,
				});
			},
		);

		it(
			"flushes the latest bounds and cancels pending debounced persistence on close",
			async () => {
				vi.useFakeTimers();
				const win = new TestBrowserWindow();

				await registerTestWindow(win);

				win.emit("resize");
				expect(vi.getTimerCount()).toBe(1);

				win.bounds = {
					height: 720,
					width:  1_280,
					x:      50,
					y:      60,
				};
				win.emit("close");

				expect(setWindowBounds).toHaveBeenCalledTimes(1);
				expect(setWindowBounds).toHaveBeenCalledWith({
					...win.bounds,
					isMaximized: false,
				});
				expect(vi.getTimerCount()).toBe(0);

				await vi.advanceTimersByTimeAsync(250);

				expect(setWindowBounds).toHaveBeenCalledTimes(1);
			},
		);
	},
);
