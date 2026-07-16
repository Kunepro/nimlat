// @vitest-environment jsdom

import type {
	GroupInspectionMediaCard,
	MediaWatchStateActionResult,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
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
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../../../facades";
import { useGroupMediaWatchStateMutation } from "./useGroupMediaWatchStateMutation";

interface RenderedHook<T, P extends object> {
	result: { readonly current: T };
	rerender: (props: P) => void;
	unmount: () => void;
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

interface WatchStateHarnessProps {
	groupRef: GroupRef | null;
	notifyGroupMutationError: (errorMessage: string) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<T, P extends object>(
	useHook: (props: P) => T,
	initialProps: P,
): RenderedHook<T, P> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(props: P): ReactElement | null {
		currentValue = useHook(props);
		return null;
	}

	const render = (props: P) => {
		flushSync(() => {
			root.render(createElement(
				HookHost,
				props,
			));
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
	render(initialProps);

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

function createMedia(isWatched: boolean): GroupInspectionMediaCard {
	return {
		mediaId:     9,
		name:        "Media",
		isWatched,
		lastRefresh: "",
		isFilm:      false,
	};
}

describe(
	"useGroupMediaWatchStateMutation",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"rolls back an optimistic watched override when the facade write fails",
			async () => {
				const watchStateWrite = createDeferred<MediaWatchStateActionResult>();
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockReturnValue(watchStateWrite.promise);
				const notifyGroupMutationError = vi.fn();
				const requestWallReload        = vi.fn();
				const { result }               = renderHook(
					(props: WatchStateHarnessProps) => useGroupMediaWatchStateMutation(props),
					{
						groupRef: {
							source:  "user",
							groupId: 4,
						},
						notifyGroupMutationError,
						requestWallReload,
					},
				);

				let mutationPromise: Promise<void> | null = null;
				flushSync(() => {
					mutationPromise = result.current.handleWatchStateChange(
						createMedia(false),
						true,
					);
				});

				expect(result.current.watchStateOverrides.get(9)).toBe(true);

				watchStateWrite.resolve({
					success: false,
					error:   "write failed",
				});
				await mutationPromise;

				await waitForAssertion(() => {
					expect(result.current.watchStateOverrides.get(9)).toBe(false);
				});
				expect(notifyGroupMutationError).toHaveBeenCalledWith("write failed");
				expect(requestWallReload).not.toHaveBeenCalled();
			},
		);

		it(
			"applies persisted watched patches to the mounted media wall state immediately",
			() => {
				const { result } = renderHook(
					(props: WatchStateHarnessProps) => useGroupMediaWatchStateMutation(props),
					{
						groupRef:                 {
							source:  "official",
							groupId: 7,
						},
						notifyGroupMutationError: vi.fn(),
						requestWallReload:        vi.fn(),
					},
				);

				flushSync(() => {
					result.current.applyWatchStatePatches([
						{
							mediaId:   9,
							isWatched: true,
						},
						{
							mediaId: 10,
							name:    "Metadata-only patch",
						},
					]);
				});

				expect(result.current.watchStateOverrides).toEqual(new Map([
					[
						9,
						true,
					],
				]));
			},
		);

		it(
			"clears watched overrides when the routed group changes",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 9 ],
				});
				const {
								result,
								rerender,
							} = renderHook(
					(props: WatchStateHarnessProps) => useGroupMediaWatchStateMutation(props),
					{
						groupRef:                 {
							source:  "user",
							groupId: 4,
						},
						notifyGroupMutationError: vi.fn(),
						requestWallReload:        vi.fn(),
					},
				);

				await result.current.handleWatchStateChange(
					createMedia(false),
					true,
				);
				await waitForAssertion(() => {
					expect(result.current.watchStateOverrides.get(9)).toBe(true);
				});

				rerender({
					groupRef:                 {
						source:  "user",
						groupId: 5,
					},
					notifyGroupMutationError: vi.fn(),
					requestWallReload:        vi.fn(),
				});

				await waitForAssertion(() => {
					expect(result.current.watchStateOverrides.size).toBe(0);
				});
			},
		);
	},
);
