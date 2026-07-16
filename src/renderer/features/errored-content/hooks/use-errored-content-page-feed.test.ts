// @vitest-environment jsdom

import type {
	ErroredContentItem,
	ErroredContentPage,
	ErroredContentQueue,
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
import { PAGE_LIMIT } from "../errored-content.constants";
import { useErroredContentPageFeed } from "./use-errored-content-page-feed";

const erroredContentRunnerMock = vi.hoisted(() => ({
	listErroredContentPage:                vi.fn<(offset: number, limit: number, queue: ErroredContentQueue | null, includeHidden: boolean) => Promise<ErroredContentPage>>(),
	subscribeToErroredContentQueueChanges: vi.fn<(onChange: () => void) => { unsubscribe: () => void }>(),
}));

const appMessageMock = vi.hoisted(() => ({
	error: vi.fn(),
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
		listErroredContentPage:                erroredContentRunnerMock.listErroredContentPage,
		subscribeToErroredContentQueueChanges: erroredContentRunnerMock.subscribeToErroredContentQueueChanges,
	}),
);

interface HookProps {
	queue: ErroredContentQueue | null;
	showHidden: boolean;
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

let cleanupRenderedHooks: Array<() => void>  = [];
let queueChangeListener: (() => void) | null = null;
let unsubscribeQueueChanges: ReturnType<typeof vi.fn>;

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

function createItem(
	name: string,
	mediaId: number,
): ErroredContentItem {
	return {
		queue:              "characters",
		mediaId,
		name,
		queueStatus:        "failed",
		retryCount:         1,
		isHidden:           false,
		canOpenMedia:       true,
		canRetry:           true,
		isAutoRetryPlanned: false,
		isRetryExhausted:   false,
		recommendedAction:  "retry",
		fingerprint:        `characters:${ mediaId }`,
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
	"useErroredContentPageFeed",
	() => {
		beforeEach(() => {
			queueChangeListener     = null;
			unsubscribeQueueChanges = vi.fn();
			erroredContentRunnerMock.subscribeToErroredContentQueueChanges.mockImplementation((listener) => {
				queueChangeListener = listener;
				return { unsubscribe: unsubscribeQueueChanges };
			});
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.clearAllMocks();
		});

		it(
			"loads the first page, appends later pages, refreshes from queue changes, and unsubscribes",
			async () => {
				let firstPageItems = [
					createItem(
						"Akira",
						1,
					),
					createItem(
						"Monster",
						2,
					),
				];
				erroredContentRunnerMock.listErroredContentPage.mockImplementation(offset => Promise.resolve({
					items:      offset === 0 ? firstPageItems : [
						createItem(
							"Texhnolyze",
							3,
						),
					],
					nextOffset: offset === 0 ? PAGE_LIMIT : null,
					total:      offset === 0 ? firstPageItems.length + 1 : 3,
				}));

				const {
								result,
								unmount,
							} = renderHook<HookProps, ReturnType<typeof useErroredContentPageFeed>>(
					({
						 queue,
						 showHidden,
					 }) => useErroredContentPageFeed({
						queue,
						showHidden,
					}),
					{
						queue:      "characters",
						showHidden: false,
					},
				);

				await waitForAssertion(() => {
					expect(result.current.items.map(item => item.name)).toEqual([
						"Akira",
						"Monster",
					]);
					expect(result.current.nextOffset).toBe(PAGE_LIMIT);
					expect(result.current.total).toBe(3);
				});

				await result.current.loadMore();

				await waitForAssertion(() => {
					expect(result.current.items.map(item => item.name)).toEqual([
						"Akira",
						"Monster",
						"Texhnolyze",
					]);
					expect(result.current.nextOffset).toBeNull();
				});

				firstPageItems = [
					createItem(
						"Refreshed",
						4,
					),
				];
				queueChangeListener?.();

				await waitForAssertion(() => {
					expect(result.current.items.map(item => item.name)).toEqual([ "Refreshed" ]);
				});

				expect(erroredContentRunnerMock.listErroredContentPage).toHaveBeenCalledWith(
					0,
					PAGE_LIMIT,
					"characters",
					false,
				);
				expect(erroredContentRunnerMock.listErroredContentPage).toHaveBeenCalledWith(
					PAGE_LIMIT,
					PAGE_LIMIT,
					"characters",
					false,
				);

				unmount();
				expect(unsubscribeQueueChanges).toHaveBeenCalledTimes(1);
				expect(appMessageMock.error).not.toHaveBeenCalled();
			},
		);

		it(
			"ignores stale page results after the queue filter changes",
			async () => {
				const staleCharactersPage = createDeferred<ErroredContentPage>();
				erroredContentRunnerMock.listErroredContentPage.mockImplementation((
					_offset,
					_limit,
					queue,
				) => queue === "characters"
					? staleCharactersPage.promise
					: Promise.resolve({
						items:      [
							createItem(
								"Staff refresh",
								20,
							),
						],
						nextOffset: null,
						total:      1,
					}));

				const {
								result,
								rerender,
							} = renderHook<HookProps, ReturnType<typeof useErroredContentPageFeed>>(
					({
						 queue,
						 showHidden,
					 }) => useErroredContentPageFeed({
						queue,
						showHidden,
					}),
					{
						queue:      "characters",
						showHidden: false,
					},
				);

				await waitForAssertion(() => {
					expect(erroredContentRunnerMock.listErroredContentPage).toHaveBeenCalledWith(
						0,
						PAGE_LIMIT,
						"characters",
						false,
					);
				});

				rerender({
					queue:      "staff",
					showHidden: false,
				});

				await waitForAssertion(() => {
					expect(result.current.items.map(item => item.name)).toEqual([ "Staff refresh" ]);
				});

				staleCharactersPage.resolve({
					items:      [
						createItem(
							"Old characters result",
							10,
						),
					],
					nextOffset: null,
					total:      1,
				});

				await waitForAssertion(() => {
					expect(result.current.items.map(item => item.name)).toEqual([ "Staff refresh" ]);
				});
				expect(appMessageMock.error).not.toHaveBeenCalled();
			},
		);

		it(
			"routes initial and refresh failures through stable user-facing messages",
			async () => {
				const initialError = new Error("initial failed");
				const refreshError = new Error("refresh failed");
				erroredContentRunnerMock.listErroredContentPage
					.mockRejectedValueOnce(initialError)
					.mockRejectedValueOnce(refreshError);

				renderHook<HookProps, ReturnType<typeof useErroredContentPageFeed>>(
					({
						 queue,
						 showHidden,
					 }) => useErroredContentPageFeed({
						queue,
						showHidden,
					}),
					{
						queue:      null,
						showHidden: true,
					},
				);

				await waitForAssertion(() => {
					expect(appMessageMock.error).toHaveBeenCalledWith("Failed to load errored content.");
					expect(queueChangeListener).not.toBeNull();
				});

				queueChangeListener?.();

				await waitForAssertion(() => {
					expect(appMessageMock.error).toHaveBeenCalledWith("Failed to refresh errored content.");
				});
			},
		);
	},
);
