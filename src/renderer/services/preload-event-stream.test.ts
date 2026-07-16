// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createSharedPreloadEventStream } from "./preload-event-stream";

describe(
	"createSharedPreloadEventStream",
	() => {
		it(
			"fans out one preload listener and releases it after the last subscriber",
			() => {
				let listener: ((event: string) => void) | null = null;
				const unregister                               = vi.fn();
				const register                                 = vi.fn((nextListener: (event: string) => void) => {
					listener = nextListener;
					return unregister;
				});
				const stream$                                  = createSharedPreloadEventStream(register);
				const firstListener                            = vi.fn();
				const secondListener                           = vi.fn();
				const emit                                     = (event: string) => {
					if (!listener) {
						throw new Error("Preload listener was not registered.");
					}
					listener(event);
				};

				const firstSubscription  = stream$.subscribe(firstListener);
				const secondSubscription = stream$.subscribe(secondListener);

				expect(register).toHaveBeenCalledTimes(1);
				emit("ready");
				expect(firstListener).toHaveBeenCalledWith("ready");
				expect(secondListener).toHaveBeenCalledWith("ready");

				firstSubscription.unsubscribe();
				expect(unregister).not.toHaveBeenCalled();

				secondSubscription.unsubscribe();
				expect(unregister).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"registers a fresh preload listener after every subscriber has gone away",
			() => {
				const listeners: Array<(event: string) => void> = [];
				const unregisters                               = [
					vi.fn(),
					vi.fn(),
				];
				const register                                  = vi.fn((nextListener: (event: string) => void) => {
					listeners.push(nextListener);
					return unregisters[ listeners.length - 1 ];
				});
				const stream$                                   = createSharedPreloadEventStream(register);
				const firstListener                             = vi.fn();
				const secondListener                            = vi.fn();

				const firstSubscription = stream$.subscribe(firstListener);
				expect(register).toHaveBeenCalledTimes(1);
				firstSubscription.unsubscribe();
				expect(unregisters[ 0 ]).toHaveBeenCalledTimes(1);

				const secondSubscription = stream$.subscribe(secondListener);
				expect(register).toHaveBeenCalledTimes(2);

				listeners[ 0 ]?.("stale");
				expect(firstListener).not.toHaveBeenCalled();
				expect(secondListener).not.toHaveBeenCalled();

				listeners[ 1 ]?.("fresh");
				expect(secondListener).toHaveBeenCalledWith("fresh");

				secondSubscription.unsubscribe();
				expect(unregisters[ 1 ]).toHaveBeenCalledTimes(1);
			},
		);
	},
);
