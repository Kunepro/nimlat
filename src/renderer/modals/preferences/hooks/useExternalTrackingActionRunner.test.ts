// @vitest-environment jsdom

import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useExternalTrackingActionRunner } from "./useExternalTrackingActionRunner";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function createDeferred<T>(): Deferred<T> {
	let resolveDeferred: (value: T) => void        = () => {};
	let rejectDeferred: (reason?: unknown) => void = () => {};
	const promise                                  = new Promise<T>((
		resolve,
		reject,
	) => {
		resolveDeferred = resolve;
		rejectDeferred  = reject;
	});

	return {
		promise,
		resolve: resolveDeferred,
		reject:  rejectDeferred,
	};
}

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
	});

	const unmount = () => {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}

				return currentValue;
			},
		},
		unmount,
	};
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch {
			await new Promise(resolve => setTimeout(
				resolve,
				0,
			));
			await Promise.resolve();
		}
	}

	assertion();
}

describe(
	"useExternalTrackingActionRunner",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"publishes success messages, refreshes settings, and triggers credential zaps",
			async () => {
				const action               = createDeferred<{ message: string }>();
				const refreshSettings      = vi.fn();
				const triggerCredentialZap = vi.fn();
				const { result }           = renderHook(() => useExternalTrackingActionRunner({
					refreshSettings,
					triggerCredentialZap,
				}));

				flushSync(() => {
					result.current.runExternalTrackingAction(
						"mal",
						() => action.promise,
						{ zapOnSuccess: true },
					);
				});

				expect(result.current.busyProvider).toBe("mal");
				expect(result.current.messageProvider).toBe("mal");

				action.resolve({ message: "Connected MAL" });

				await waitForAssertion(() => {
					expect(result.current.busyProvider).toBeNull();
					expect(result.current.message).toBe("Connected MAL");
					expect(result.current.messageProvider).toBe("mal");
					expect(result.current.messageType).toBe("success");
					expect(refreshSettings).toHaveBeenCalledTimes(1);
					expect(triggerCredentialZap).toHaveBeenCalledWith("mal");
				});
			},
		);

		it(
			"shows resolved action failures as errors without triggering success effects",
			async () => {
				const refreshSettings      = vi.fn();
				const triggerCredentialZap = vi.fn();
				const { result }           = renderHook(() => useExternalTrackingActionRunner({
					refreshSettings,
					triggerCredentialZap,
				}));

				flushSync(() => {
					result.current.runExternalTrackingAction(
						"mal",
						() => ({
							success: false,
							message: "MyAnimeList is not connected.",
						}),
						{ zapOnSuccess: true },
					);
				});

				await waitForAssertion(() => {
					expect(result.current.message).toBe("MyAnimeList is not connected.");
					expect(result.current.messageType).toBe("error");
					expect(refreshSettings).toHaveBeenCalledTimes(1);
					expect(triggerCredentialZap).not.toHaveBeenCalled();
				});
			},
		);

		it(
			"formats failures and refreshes settings so credential-storage denials become visible",
			async () => {
				const action               = createDeferred<unknown>();
				const refreshSettings      = vi.fn();
				const triggerCredentialZap = vi.fn();
				const { result }           = renderHook(() => useExternalTrackingActionRunner({
					refreshSettings,
					triggerCredentialZap,
				}));

				flushSync(() => {
					result.current.runExternalTrackingAction(
						"anilist",
						() => action.promise,
					);
				});

				action.reject(new Error("Token rejected"));

				await waitForAssertion(() => {
					expect(result.current.busyProvider).toBeNull();
					expect(result.current.message).toBe("Token rejected");
					expect(result.current.messageType).toBe("error");
					expect(refreshSettings).toHaveBeenCalledTimes(1);
					expect(triggerCredentialZap).not.toHaveBeenCalled();
				});
			},
		);

		it(
			"shows synchronous action failures through the same feedback state",
			async () => {
				const refreshSettings      = vi.fn();
				const triggerCredentialZap = vi.fn();
				const { result }           = renderHook(() => useExternalTrackingActionRunner({
					refreshSettings,
					triggerCredentialZap,
				}));

				flushSync(() => {
					result.current.runExternalTrackingAction(
						"mal",
						() => {
							throw new Error("Export setup failed");
						},
					);
				});

				await waitForAssertion(() => {
					expect(result.current.message).toBe("Export setup failed");
					expect(result.current.messageType).toBe("error");
					expect(result.current.busyProvider).toBeNull();
				});
			},
		);

		it(
			"keeps draft state untouched for actions that only open an external page",
			async () => {
				const refreshSettings      = vi.fn();
				const triggerCredentialZap = vi.fn();
				const { result }           = renderHook(() => useExternalTrackingActionRunner({
					refreshSettings,
					triggerCredentialZap,
				}));

				flushSync(() => {
					result.current.runExternalTrackingAction(
						"anilist",
						() => Promise.resolve(),
						{ refreshSettings: false },
					);
				});

				await waitForAssertion(() => {
					expect(result.current.busyProvider).toBeNull();
					expect(refreshSettings).not.toHaveBeenCalled();
				});
			},
		);
	},
);
