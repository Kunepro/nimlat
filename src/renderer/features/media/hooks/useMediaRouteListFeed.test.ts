// @vitest-environment jsdom

import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useMediaRouteListFeed } from "./useMediaRouteListFeed";

const routeParams = vi.hoisted(() => ({
	mediaId: "1",
}));

vi.mock(
	"@tanstack/react-router",
	() => ({
		useParams: () => routeParams,
	}),
);

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
}

interface RenderedHook<T> {
	result: { readonly current: T };
	rerender: () => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function createDeferred<T>(): Deferred<T> {
	let resolveDeferred: (value: T) => void = () => {};
	const promise                           = new Promise<T>((resolve) => {
		resolveDeferred = resolve;
	});

	return {
		promise,
		resolve: resolveDeferred,
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

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

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
	render();

	return {
		result:   {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		rerender: render,
		unmount,
	};
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	const startedAt = Date.now();
	let lastError: unknown;

	while (Date.now() - startedAt < 1000) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await new Promise(resolve => window.setTimeout(
				resolve,
				0,
			));
		}
	}

	throw lastError instanceof Error ? lastError : new Error("Timed out waiting for assertion.");
}

describe(
	"useMediaRouteListFeed",
	() => {
		beforeEach(() => {
			routeParams.mediaId = "1";
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanup => cleanup());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"loads route-scoped items for the current media id",
			async () => {
				const loadItems = vi.fn<(mediaId: number) => Promise<string[]>>()
					.mockResolvedValue([ "character" ]);

				const { result } = renderHook(() => useMediaRouteListFeed({
					fallbackErrorMessage: "Failed.",
					loadItems,
				}));

				expect(result.current.mediaId).toBe(1);
				await waitForAssertion(() => expect(result.current.items).toEqual([ "character" ]));
				expect(result.current.isLoading).toBe(false);
				expect(result.current.errorMessage).toBeNull();
				expect(loadItems).toHaveBeenCalledWith(1);
			},
		);

		it(
			"keeps stale responses from replacing the active route items",
			async () => {
				const slowFirstLoad  = createDeferred<string[]>();
				const fastSecondLoad = createDeferred<string[]>();
				const loadItems      = vi.fn<(mediaId: number) => Promise<string[]>>()
					.mockReturnValueOnce(slowFirstLoad.promise)
					.mockReturnValueOnce(fastSecondLoad.promise);

				const renderedHook = renderHook(() => useMediaRouteListFeed({
					fallbackErrorMessage: "Failed.",
					loadItems,
				}));

				await waitForAssertion(() => expect(loadItems).toHaveBeenCalledWith(1));
				routeParams.mediaId = "2";
				renderedHook.rerender();
				await waitForAssertion(() => expect(loadItems).toHaveBeenCalledWith(2));

				fastSecondLoad.resolve([ "active" ]);
				await fastSecondLoad.promise;
				await waitForAssertion(() => expect(renderedHook.result.current.items).toEqual([ "active" ]));

				slowFirstLoad.resolve([ "stale" ]);
				await slowFirstLoad.promise;
				await waitForAssertion(() => expect(renderedHook.result.current.items).toEqual([ "active" ]));
			},
		);

		it(
			"uses the fallback error message for non-error failures",
			async () => {
				const loadItems = vi.fn<(mediaId: number) => Promise<string[]>>()
					.mockRejectedValue("network");

				const { result } = renderHook(() => useMediaRouteListFeed({
					fallbackErrorMessage: "Failed to load list.",
					loadItems,
				}));

				await waitForAssertion(() => expect(result.current.errorMessage).toBe("Failed to load list."));
				expect(result.current.isLoading).toBe(false);
			},
		);
	},
);
