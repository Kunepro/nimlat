// @vitest-environment jsdom
import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { Observable } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { HydratorProgressItem } from "./useHydratorProgressItems";
import {
	HYDRATOR_EVAPORATE_DURATION_MS,
	markHydratorProgressItemLeaving,
	removeHydratorProgressItem,
	upsertHydratorProgressItem,
	useHydratorProgressItems,
} from "./useHydratorProgressItems";

const hydratorProgressRunner = vi.hoisted(() => ({
	getHydratorProgressSnapshot: vi.fn<() => Promise<HydratorProgressEvent[]>>(),
	hydratorProgressChanges:     vi.fn<() => Observable<HydratorProgressEvent>>(),
}));

vi.mock(
	"../../../features/hydrator/hydrator-progress-runner",
	() => ({
		getHydratorProgressSnapshot: hydratorProgressRunner.getHydratorProgressSnapshot,
		hydratorProgressChanges:     hydratorProgressRunner.hydratorProgressChanges,
	}),
);

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let progressStream: ReturnType<typeof createProgressTestStream>;
let unsubscribeProgress: ReturnType<typeof vi.fn>;

function createProgressTestStream() {
	let listener: ((event: HydratorProgressEvent) => void) | null = null;
	const unsubscribe                                             = vi.fn();
	const observable                                              = new Observable<HydratorProgressEvent>((subscriber) => {
		listener = event => subscriber.next(event);
		return unsubscribe;
	});

	return {
		emit: (event: HydratorProgressEvent) => {
			if (!listener) {
				throw new Error("Hydrator progress stream was emitted before subscription.");
			}

			listener(event);
		},
		observable,
		unsubscribe,
	};
}

function createProgressEvent(
	taskId: string,
	status: HydratorProgressEvent["status"] = "running",
	message                                 = `${ taskId } ${ status }`,
): HydratorProgressEvent {
	return {
		message,
		queue: "characters",
		startedAt: 100,
		status,
		taskId,
		updatedAt: 200,
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

async function flushHookEffects() {
	for (let pass = 0; pass < 5; pass += 1) {
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(0);
		await Promise.resolve();
	}
}

describe(
	"useHydratorProgressItems helpers",
	() => {
		it(
			"upserts, marks leaving, and removes progress items without mutating previous state",
			() => {
				const runningEvent                         = createProgressEvent("task-1");
				const completedEvent                       = createProgressEvent(
					"task-1",
					"completed",
				);
				const initialItems: HydratorProgressItem[] = [];

				const runningItems   = upsertHydratorProgressItem(
					initialItems,
					runningEvent,
				);
				const completedItems = upsertHydratorProgressItem(
					runningItems,
					completedEvent,
				);
				const leavingItems   = markHydratorProgressItemLeaving(
					completedItems,
					"task-1",
				);
				const removedItems   = removeHydratorProgressItem(
					leavingItems,
					"task-1",
				);

				expect(initialItems).toEqual([]);
				expect(runningItems).toEqual([
					{
						...runningEvent,
						isLeaving: false,
					},
				]);
				expect(completedItems).toEqual([
					{
						...completedEvent,
						isLeaving: false,
					},
				]);
				expect(leavingItems[ 0 ]?.isLeaving).toBe(true);
				expect(removedItems).toEqual([]);
			},
		);
	},
);

describe(
	"useHydratorProgressItems",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.clearAllMocks();
			progressStream      = createProgressTestStream();
			unsubscribeProgress = progressStream.unsubscribe;
			hydratorProgressRunner.getHydratorProgressSnapshot.mockResolvedValue([]);
			hydratorProgressRunner.hydratorProgressChanges.mockReturnValue(progressStream.observable);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.useRealTimers();
		});

		it(
			"hydrates existing progress snapshot on mount",
			async () => {
				const runningEvent = createProgressEvent("snapshot-task");
				hydratorProgressRunner.getHydratorProgressSnapshot.mockResolvedValueOnce([ runningEvent ]);

				const { result } = renderHook(useHydratorProgressItems);

				expect(result.current).toEqual([]);
				await flushHookEffects();
				expect(result.current).toEqual([
					{
						...runningEvent,
						isLeaving: false,
					},
				]);
			},
		);

		it(
			"marks completed events as leaving and removes them after evaporation",
			async () => {
				const { result } = renderHook(useHydratorProgressItems);
				await flushHookEffects();
				const runningEvent   = createProgressEvent("task-1");
				const completedEvent = createProgressEvent(
					"task-1",
					"completed",
				);

				flushSync(() => {
					progressStream.emit(runningEvent);
				});
				expect(result.current).toEqual([
					{
						...runningEvent,
						isLeaving: false,
					},
				]);

				flushSync(() => {
					progressStream.emit(completedEvent);
				});
				expect(result.current).toEqual([
					{
						...completedEvent,
						isLeaving: true,
					},
				]);

				flushSync(() => {
					vi.advanceTimersByTime(HYDRATOR_EVAPORATE_DURATION_MS);
				});
				expect(result.current).toEqual([]);
			},
		);

		it(
			"cleans up progress subscription and pending removal timers on unmount",
			async () => {
				const clearTimeoutSpy = vi.spyOn(
					globalThis,
					"clearTimeout",
				);
				const { unmount }     = renderHook(useHydratorProgressItems);
				await flushHookEffects();

				flushSync(() => {
					progressStream.emit(createProgressEvent(
						"task-1",
						"failed",
					));
				});
				unmount();

				expect(unsubscribeProgress).toHaveBeenCalledTimes(1);
				expect(clearTimeoutSpy).toHaveBeenCalled();
			},
		);
	},
);
