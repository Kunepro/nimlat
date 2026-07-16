// @vitest-environment node
import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installHydratorApi() {
	let queueListener: (() => void) | null                                = null;
	let progressListener: ((event: HydratorProgressEvent) => void) | null = null;
	const unsubscribeQueue                                                = vi.fn();
	const unsubscribeProgress                                             = vi.fn();
	const hydrator                                                        = {
		onQueueChanged: vi.fn((listener: () => void) => {
			queueListener = listener;
			return unsubscribeQueue;
		}),
		onProgress:     vi.fn((listener: (event: HydratorProgressEvent) => void) => {
			progressListener = listener;
			return unsubscribeProgress;
		}),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				hydrator,
			},
		},
	);

	return {
		hydrator,
		unsubscribeQueue,
		unsubscribeProgress,
		emitQueueChanged: () => {
			queueListener?.();
		},
		emitProgress:     (event: HydratorProgressEvent) => {
			progressListener?.(event);
		},
	};
}

const progressEvent: HydratorProgressEvent = {
	taskId:    "characters:1",
	queue:     "characters",
	status:    "running",
	message:   "Hydrating characters",
	startedAt: 1,
	updatedAt: 2,
};

describe(
	"HydratorEventService",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"exposes queue changes as a shared void event stream",
			async () => {
				const {
								emitQueueChanged,
								hydrator,
								unsubscribeQueue,
							}                        = installHydratorApi();
				const { HydratorEventService } = await import("./hydrator-event-service");
				const listener                 = vi.fn();

				const subscription = HydratorEventService.queueChanges().subscribe(listener);

				expect(hydrator.onQueueChanged).toHaveBeenCalledTimes(1);
				emitQueueChanged();
				expect(listener).toHaveBeenCalledWith(undefined);

				subscription.unsubscribe();
				expect(unsubscribeQueue).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes progress events as a shared stream",
			async () => {
				const {
								emitProgress,
								hydrator,
								unsubscribeProgress,
							}                        = installHydratorApi();
				const { HydratorEventService } = await import("./hydrator-event-service");
				const firstListener            = vi.fn();
				const secondListener           = vi.fn();

				const firstSubscription  = HydratorEventService.progressChanges().subscribe(firstListener);
				const secondSubscription = HydratorEventService.progressChanges().subscribe(secondListener);

				expect(hydrator.onProgress).toHaveBeenCalledTimes(1);
				emitProgress(progressEvent);
				expect(firstListener).toHaveBeenCalledWith(progressEvent);
				expect(secondListener).toHaveBeenCalledWith(progressEvent);

				firstSubscription.unsubscribe();
				secondSubscription.unsubscribe();
				expect(unsubscribeProgress).toHaveBeenCalledTimes(1);
			},
		);
	},
);
