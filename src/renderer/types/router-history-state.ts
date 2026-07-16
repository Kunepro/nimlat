import "@tanstack/history";
import type { NavigateOptions } from "@tanstack/react-router";

// Typed transient route state used only for navigation hints such as optimistic
// titles. Persistent UI state still belongs in DB-backed main-process reads.
export interface NimlatRouteHistoryState {
	groupName?: string;
	mediaName?: string;
	isFilm?: boolean;
}

declare module "@tanstack/history" {
	interface HistoryState {
		groupName?: string;
		mediaName?: string;
		isFilm?: boolean;
	}
}

export type NimlatRouteHistoryStateUpdater = Exclude<NonNullable<NavigateOptions["state"]>, true>;

export function createRouteHistoryState(state: NimlatRouteHistoryState): NimlatRouteHistoryStateUpdater {
	const cleanState = readRouteHistoryState(state);

	const updateRouteState = (previousState: unknown) => ({
		...(typeof previousState === "object" && previousState !== null ? previousState : {}),
		...cleanState,
	});

	return updateRouteState as unknown as NimlatRouteHistoryStateUpdater;
}

export function readRouteHistoryState(state: unknown): NimlatRouteHistoryState {
	if (!state || typeof state !== "object") {
		return {};
	}

	const candidate = state as Record<string, unknown>;
	return {
		groupName: typeof candidate.groupName === "string" ? candidate.groupName : undefined,
		mediaName: typeof candidate.mediaName === "string" ? candidate.mediaName : undefined,
		isFilm:    typeof candidate.isFilm === "boolean" ? candidate.isFilm : undefined,
	};
}
