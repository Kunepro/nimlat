import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { RetryDelayController } from "./retry-delay-controller";

describe(
	"RetryDelayController",
	() => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it(
			"resolves when the target time is reached",
			async () => {
				vi.useFakeTimers();
				vi.setSystemTime(1_000);
				const controller = new RetryDelayController();
				let resolved     = false;

				const waitPromise = controller.waitUntil(6_000)
					.then(() => {
						resolved = true;
					});

				await vi.advanceTimersByTimeAsync(4_999);
				expect(resolved).toBe(false);

				await vi.advanceTimersByTimeAsync(1);
				await waitPromise;
				expect(resolved).toBe(true);
			},
		);

		it(
			"resolves immediately when cancelled",
			async () => {
				vi.useFakeTimers();
				vi.setSystemTime(1_000);
				const controller = new RetryDelayController();
				let resolved     = false;

				const waitPromise = controller.waitUntil(60_000)
					.then(() => {
						resolved = true;
					});

				controller.cancel();
				await waitPromise;
				expect(resolved).toBe(true);
			},
		);

		it(
			"releases the scheduled timer when cancelled",
			async () => {
				vi.useFakeTimers();
				vi.setSystemTime(1_000);
				const controller = new RetryDelayController();

				const waitPromise = controller.waitUntil(60_000);

				expect(vi.getTimerCount()).toBe(1);

				controller.cancel();
				await waitPromise;

				expect(vi.getTimerCount()).toBe(0);
			},
		);
	},
);
