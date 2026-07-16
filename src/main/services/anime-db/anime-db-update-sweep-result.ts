import type { AnimeDbUpdateBatchEvent } from "./anime-db-update-batch-processor";
import type { SweepResult } from "./anime-db-update-policy";
import type { AnimeDbUpdateSweepEvent } from "./anime-db-update-sweep-runner";

type CompletedSweepEvent = Extract<AnimeDbUpdateSweepEvent, { kind: "completed" }>;
type StoppedSweepEvent = Extract<AnimeDbUpdateSweepEvent, { kind: "stopped" }>;

export function createAnimeDbUpdateSweepResult(input: {
	initialMaxProviderUpdatedAt: number;
	initialLastTailPage?: number;
}): SweepResult {
	return {
		maxProviderUpdatedAt: input.initialMaxProviderUpdatedAt,
		lastTailPage:         input.initialLastTailPage,
		stopped:              false,
	};
}

export function applyAnimeDbUpdateSweepStoppedEvent(
	current: SweepResult,
	event: StoppedSweepEvent,
): SweepResult {
	return {
		...current,
		lastTailPage: event.lastTailPage ?? current.lastTailPage,
		stopped:      true,
	};
}

export function applyAnimeDbUpdateSweepCompletedEvent(
	current: SweepResult,
	event: CompletedSweepEvent,
): SweepResult {
	return {
		...current,
		lastTailPage: event.lastTailPage ?? current.lastTailPage,
	};
}

export function applyAnimeDbUpdateBatchEvent(
	current: SweepResult,
	event: AnimeDbUpdateBatchEvent,
): SweepResult {
	if (event.kind === "stopped") {
		return {
			...current,
			maxProviderUpdatedAt: event.maxProviderUpdatedAt,
			stopped:              true,
		};
	}

	return {
		...current,
		maxProviderUpdatedAt: event.maxProviderUpdatedAt,
	};
}
