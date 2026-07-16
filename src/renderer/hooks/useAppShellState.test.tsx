// @vitest-environment jsdom
import {
	type BackgroundStyle,
	DEFAULT_BACKGROUND_STYLE,
} from "@nimlat/types/user-config";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	Observable,
	Subject,
} from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useAppShellState } from "./useAppShellState";

const appShellRunner = vi.hoisted(() => ({
	backgroundStyleChanges: vi.fn<() => Observable<BackgroundStyle>>(),
	loadBackgroundStyle:    vi.fn<() => Promise<BackgroundStyle>>(),
	persistLastRoute:       vi.fn<(route: string) => Promise<void>>(),
}));

vi.mock(
	"../app-shell-runner",
	() => appShellRunner,
);

interface RenderedHook<T, TProps extends object> {
	result: { readonly current: T };
	rerender: (nextProps: TProps) => void;
	unmount: () => void;
}

interface AppShellHookProps {
	routeHref: string;
}

let cleanupRenderedHooks: Array<() => void> = [];
let backgroundStyleStream: Subject<BackgroundStyle>;
let unsubscribeBackgroundStyle: ReturnType<typeof vi.fn>;

function renderHook<T, TProps extends object>(
	useHook: (props: TProps) => T,
	initialProps: TProps,
): RenderedHook<T, TProps> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(props: TProps): ReactElement | null {
		currentValue = useHook(props);
		return null;
	}

	flushSync(() => {
		root.render(createElement(
			HookHost,
			initialProps,
		));
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
		result:   {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		rerender: (nextProps) => {
			flushSync(() => {
				root.render(createElement(
					HookHost,
					nextProps,
				));
			});
		},
		unmount,
	};
}

function createDeferredBackgroundStyle() {
	let resolve: ((value: BackgroundStyle) => void) | null = null;
	const promise                                          = new Promise<BackgroundStyle>((deferredResolve) => {
		resolve = deferredResolve;
	});

	return {
		promise,
		resolve: (style: BackgroundStyle) => {
			if (!resolve) {
				throw new Error("Deferred background style was not initialized.");
			}

			resolve(style);
		},
	};
}

async function advanceTimers(ms: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms);
	await Promise.resolve();
	await Promise.resolve();
}

async function flushHookEffects(): Promise<void> {
	for (let index = 0; index < 3; index += 1) {
		await new Promise(resolve => setTimeout(
			resolve,
			0,
		));
		await Promise.resolve();
		await Promise.resolve();
	}
}

describe(
	"useAppShellState",
	() => {
		beforeEach(() => {
			backgroundStyleStream      = new Subject<BackgroundStyle>();
			unsubscribeBackgroundStyle = vi.fn();

			appShellRunner.persistLastRoute.mockReset();
			appShellRunner.loadBackgroundStyle.mockReset();
			appShellRunner.backgroundStyleChanges.mockReset();
			appShellRunner.persistLastRoute.mockResolvedValue(undefined);
			appShellRunner.loadBackgroundStyle.mockResolvedValue(DEFAULT_BACKGROUND_STYLE);
			appShellRunner.backgroundStyleChanges.mockReturnValue(new Observable<BackgroundStyle>((subscriber) => {
				const subscription = backgroundStyleStream.subscribe(subscriber);
				return () => {
					subscription.unsubscribe();
					unsubscribeBackgroundStyle();
				};
			}));
		});

		afterEach(() => {
			for (const cleanupHook of cleanupRenderedHooks) {
				cleanupHook();
			}
			cleanupRenderedHooks = [];
			vi.useRealTimers();
		});

		it(
			"debounces persistence for restorable routes",
			async () => {
				vi.useFakeTimers();
				renderHook(
					(props: AppShellHookProps) => useAppShellState(props.routeHref),
					{ routeHref: "/groups/e2e" },
				);

				await advanceTimers(249);
				expect(appShellRunner.persistLastRoute).not.toHaveBeenCalled();

				await advanceTimers(1);
				expect(appShellRunner.persistLastRoute).toHaveBeenCalledWith("/groups/e2e");
			},
		);

		it(
			"does not persist non-restorable routes",
			async () => {
				vi.useFakeTimers();
				renderHook(
					(props: AppShellHookProps) => useAppShellState(props.routeHref),
					{ routeHref: "/settings" },
				);

				await advanceTimers(300);

				expect(appShellRunner.persistLastRoute).not.toHaveBeenCalled();
			},
		);

		it(
			"cancels stale route persistence when navigation changes",
			async () => {
				vi.useFakeTimers();
				const renderedHook = renderHook(
					(props: AppShellHookProps) => useAppShellState(props.routeHref),
					{ routeHref: "/groups/first" },
				);

				await advanceTimers(100);
				renderedHook.rerender({ routeHref: "/release-watch/second" });
				await advanceTimers(249);
				expect(appShellRunner.persistLastRoute).not.toHaveBeenCalled();

				await advanceTimers(1);
				expect(appShellRunner.persistLastRoute).toHaveBeenCalledTimes(1);
				expect(appShellRunner.persistLastRoute).toHaveBeenCalledWith("/release-watch/second");
			},
		);

		it(
			"loads the persisted background style and reacts to later config events",
			async () => {
				const loadedStyle = createDeferredBackgroundStyle();
				appShellRunner.loadBackgroundStyle.mockReturnValueOnce(loadedStyle.promise);

				const { result } = renderHook(
					(props: AppShellHookProps) => useAppShellState(props.routeHref),
					{ routeHref: "/" },
				);

				expect(result.current).toBe(DEFAULT_BACKGROUND_STYLE);

				loadedStyle.resolve("synthwave");
				await loadedStyle.promise;
				await flushHookEffects();
				expect(result.current).toBe("synthwave");

				flushSync(() => {
					backgroundStyleStream.next("kanaGrid");
				});
				expect(result.current).toBe("kanaGrid");
			},
		);

		it(
			"unsubscribes from background style events on unmount",
			async () => {
				const { unmount } = renderHook(
					(props: AppShellHookProps) => useAppShellState(props.routeHref),
					{ routeHref: "/" },
				);

				unmount();

				expect(unsubscribeBackgroundStyle).toHaveBeenCalledTimes(1);
			},
		);
	},
);
