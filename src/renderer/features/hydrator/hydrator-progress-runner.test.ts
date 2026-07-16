// @vitest-environment jsdom

import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { HydratorFacade } from "../../facades";
import {
	getHydratorProgressSnapshot,
	hydratorProgressChanges,
} from "./hydrator-progress-runner";

function createProgressEvent(): HydratorProgressEvent {
	return {
		message:   "Hydrating media",
		queue: "characters",
		startedAt: 100,
		status:    "running",
		taskId:    "task-1",
		updatedAt: 200,
	};
}

describe(
	"hydrator-progress-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads the current progress snapshot through the hydrator facade",
			async () => {
				const snapshot = [ createProgressEvent() ];
				vi.spyOn(
					HydratorFacade,
					"getProgressSnapshot",
				).mockResolvedValue(snapshot);

				await expect(getHydratorProgressSnapshot()).resolves.toBe(snapshot);

				expect(HydratorFacade.getProgressSnapshot).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes the hydrator progress event stream from the hydrator facade",
			() => {
				const changes$ = new Subject<HydratorProgressEvent>();
				const listener = vi.fn();
				vi.spyOn(
					HydratorFacade,
					"progressChanges",
				).mockReturnValue(changes$);

				const subscription = hydratorProgressChanges().subscribe(listener);
				const event        = createProgressEvent();

				changes$.next(event);

				expect(listener).toHaveBeenCalledWith(event);
				expect(HydratorFacade.progressChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);
	},
);
