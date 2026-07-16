// @vitest-environment jsdom

import type {
	ErroredContentItem,
	ErroredContentQueue,
	HideErroredContentResult,
	ReportErroredContentResult,
	RetryAllErroredContentResult,
	RetryErroredContentResult,
} from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { getRowActionKey } from "../errored-content-formatters";
import { useErroredContentActions } from "./use-errored-content-actions";

const appMessageMock = vi.hoisted(() => ({
	error:   vi.fn(),
	success: vi.fn(),
	warning: vi.fn(),
}));

const erroredContentRunnerMock = vi.hoisted(() => ({
	hideErroredContentItem:      vi.fn<(item: ErroredContentItem) => Promise<HideErroredContentResult>>(),
	reportErroredContentItem:    vi.fn<(item: ErroredContentItem) => Promise<ReportErroredContentResult>>(),
	retryAllErroredContentItems: vi.fn<(queue: ErroredContentQueue | null) => Promise<RetryAllErroredContentResult>>(),
	retryErroredContentItem:     vi.fn<(item: ErroredContentItem) => Promise<RetryErroredContentResult>>(),
}));

vi.mock(
	"../../../hooks",
	() => ({
		useAppMessage: () => appMessageMock,
	}),
);

vi.mock(
	"../errored-content-runner",
	() => ({
		hideErroredContentItem:      erroredContentRunnerMock.hideErroredContentItem,
		reportErroredContentItem:    erroredContentRunnerMock.reportErroredContentItem,
		retryAllErroredContentItems: erroredContentRunnerMock.retryAllErroredContentItems,
		retryErroredContentItem:     erroredContentRunnerMock.retryErroredContentItem,
	}),
);

interface HookProps {
	queue: ErroredContentQueue | null;
	loadPage: (offset?: number) => Promise<void>;
}

interface RenderedHook<TProps, TResult> {
	result: { readonly current: TResult };
	rerender: (nextProps: TProps) => void;
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

function createItem(overrides: Partial<ErroredContentItem> = {}): ErroredContentItem {
	return {
		queue:              "characters",
		mediaId:            86,
		name:               "Texhnolyze",
		queueStatus:        "failed",
		retryCount:         1,
		isHidden:           false,
		canOpenMedia:       true,
		canRetry:           true,
		isAutoRetryPlanned: false,
		isRetryExhausted:   false,
		recommendedAction:  "retry",
		fingerprint:        "characters:86",
		...overrides,
	};
}

function renderHook<TProps, TResult>(
	useHook: (props: TProps) => TResult,
	initialProps: TProps,
): RenderedHook<TProps, TResult> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentProps = initialProps;
	let currentValue: TResult | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook(currentProps);
		return null;
	}

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	render();

	const rerender = (nextProps: TProps) => {
		currentProps = nextProps;
		render();
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

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}

				return currentValue;
			},
		},
		rerender,
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
	"useErroredContentActions",
	() => {
		beforeEach(() => {
			vi.useRealTimers();
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.clearAllMocks();
			vi.useRealTimers();
		});

		it(
			"runs retry with row pending state and reloads the page on success",
			async () => {
				const item          = createItem();
				const retryDeferred = createDeferred<RetryErroredContentResult>();
				const loadPage      = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				erroredContentRunnerMock.retryErroredContentItem.mockReturnValueOnce(retryDeferred.promise);
				const { result } = renderHook<HookProps, ReturnType<typeof useErroredContentActions>>(
					props => useErroredContentActions(props),
					{
						queue: "characters",
						loadPage,
					},
				);

				const retryPromise = result.current.retryItem(item);

				await waitForAssertion(() => {
					expect(result.current.pendingActionKeys).toEqual([
						getRowActionKey(
							item,
							"retry",
						),
					]);
				});

				retryDeferred.resolve({ success: true });
				await retryPromise;

				await waitForAssertion(() => {
					expect(result.current.pendingActionKeys).toEqual([]);
				});
				expect(appMessageMock.success).toHaveBeenCalledWith("Retry queued.");
				expect(loadPage).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"warns and skips the runner for non-retryable items",
			async () => {
				const loadPage   = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const { result } = renderHook<HookProps, ReturnType<typeof useErroredContentActions>>(
					props => useErroredContentActions(props),
					{
						queue: null,
						loadPage,
					},
				);

				await result.current.retryItem(createItem({ canRetry: false }));

				expect(appMessageMock.warning).toHaveBeenCalledWith("This failure is not retryable. Report it or hide it from this list.");
				expect(erroredContentRunnerMock.retryErroredContentItem).not.toHaveBeenCalled();
				expect(loadPage).not.toHaveBeenCalled();
			},
		);

		it(
			"reports hide failures and clears pending state without reloading",
			async () => {
				const item     = createItem();
				const loadPage = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				erroredContentRunnerMock.hideErroredContentItem.mockResolvedValueOnce({
					success: false,
					error:   "write failed",
				});
				const { result } = renderHook<HookProps, ReturnType<typeof useErroredContentActions>>(
					props => useErroredContentActions(props),
					{
						queue: "characters",
						loadPage,
					},
				);

				await result.current.hideItem(item);

				await waitForAssertion(() => {
					expect(result.current.pendingActionKeys).toEqual([]);
				});
				expect(appMessageMock.error).toHaveBeenCalledWith("Failed to hide item: write failed");
				expect(loadPage).not.toHaveBeenCalled();
			},
		);

		it(
			"reports items without forcing a page reload",
			async () => {
				const item     = createItem();
				const loadPage = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				erroredContentRunnerMock.reportErroredContentItem.mockResolvedValueOnce({
					success:     true,
					fingerprint: item.fingerprint,
					reportUrl:   "https://github.example/issues/new",
				});
				const { result } = renderHook<HookProps, ReturnType<typeof useErroredContentActions>>(
					props => useErroredContentActions(props),
					{
						queue: "characters",
						loadPage,
					},
				);

				await result.current.reportItem(item);

				expect(appMessageMock.success).toHaveBeenCalledWith("GitHub report opened for characters:86.");
				expect(loadPage).not.toHaveBeenCalled();
			},
		);

		it(
			"runs retry-all against the active queue with page-level busy state",
			async () => {
				const retryAllDeferred = createDeferred<RetryAllErroredContentResult>();
				const loadPage         = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				erroredContentRunnerMock.retryAllErroredContentItems.mockReturnValueOnce(retryAllDeferred.promise);
				const { result } = renderHook<HookProps, ReturnType<typeof useErroredContentActions>>(
					props => useErroredContentActions(props),
					{
						queue: "staff",
						loadPage,
					},
				);

				const retryAllPromise = result.current.retryAll();

				await waitForAssertion(() => {
					expect(result.current.isRetryingAll).toBe(true);
				});

				retryAllDeferred.resolve({
					success:      true,
					retriedCount: 2,
				});
				await retryAllPromise;

				await waitForAssertion(() => {
					expect(result.current.isRetryingAll).toBe(false);
				});
				expect(erroredContentRunnerMock.retryAllErroredContentItems).toHaveBeenCalledWith("staff");
				expect(appMessageMock.success).toHaveBeenCalledWith("Queued 2 items for retry.");
				expect(loadPage).toHaveBeenCalledTimes(1);
			},
		);
	},
);
