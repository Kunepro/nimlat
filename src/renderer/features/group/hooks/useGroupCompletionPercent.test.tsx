// @vitest-environment jsdom

import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
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
import { GroupExplorerFacade } from "../../../facades";
import { useGroupCompletionPercent } from "./useGroupCompletionPercent";

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

interface UseGroupCompletionPercentProps {
	group?: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
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

function createSummary(overrides: Partial<GroupInspectionSummary> = {}): GroupInspectionSummary {
	return {
		groupId:            1,
		name:               "Planetes",
		mediasCount:        2,
		watchedMediasCount: 0,
		...overrides,
	};
}

describe(
	"useGroupCompletionPercent",
	() => {
		const groupRef: GroupRef = {
			source:  "official",
			groupId: 1,
		};

		beforeEach(
			() => {
				vi.spyOn(
					GroupExplorerFacade,
					"getInspectionSummary",
				).mockResolvedValue(createSummary({ integrationPercent: 10 }));
			},
		);

		afterEach(
			() => {
				cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
				cleanupRenderedHooks = [];
				vi.restoreAllMocks();
			},
		);

		it(
			"uses the provided group without fetching a fallback summary",
			() => {
				const { result } = renderHook(
					({
						 group,
						 groupRef: nextGroupRef,
					 }: UseGroupCompletionPercentProps) => useGroupCompletionPercent({
						group,
						groupRef: nextGroupRef,
					}),
					{
						group: createSummary({ integrationPercent: 72 }),
						groupRef,
					},
				);

				expect(result.current).toBe(72);
				expect(GroupExplorerFacade.getInspectionSummary).not.toHaveBeenCalled();
			},
		);

		it(
			"loads a fallback summary when only a group ref is available",
			async () => {
				const fallbackSummary = createSummary({ integrationPercent: 38 });
				vi.mocked(GroupExplorerFacade.getInspectionSummary).mockResolvedValueOnce(fallbackSummary);
				const { result } = renderHook(
					({
						 group,
						 groupRef: nextGroupRef,
					 }: UseGroupCompletionPercentProps) => useGroupCompletionPercent({
						group,
						groupRef: nextGroupRef,
					}),
					{
						group: null,
						groupRef,
					},
				);

				await waitForAssertion(() => {
					expect(result.current).toBe(38);
				});
				expect(GroupExplorerFacade.getInspectionSummary).toHaveBeenCalledWith(groupRef);
			},
		);

		it(
			"ignores stale fallback responses after the header receives a concrete group",
			async () => {
				const deferred = createDeferred<GroupInspectionSummary>();
				vi.mocked(GroupExplorerFacade.getInspectionSummary).mockReturnValueOnce(deferred.promise);
				const initialProps: UseGroupCompletionPercentProps = {
					group: null,
					groupRef,
				};
				const {
								result,
								rerender,
							}                                            = renderHook<number | null, UseGroupCompletionPercentProps>(
					({
						 group,
						 groupRef: nextGroupRef,
					 }: UseGroupCompletionPercentProps) => useGroupCompletionPercent({
						group,
						groupRef: nextGroupRef,
					}),
					initialProps,
				);

				rerender({
					group: createSummary({ integrationPercent: 80 }),
					groupRef,
				});
				deferred.resolve(createSummary({ integrationPercent: 15 }));

				await waitForAssertion(() => {
					expect(result.current).toBe(80);
				});
			},
		);
	},
);
