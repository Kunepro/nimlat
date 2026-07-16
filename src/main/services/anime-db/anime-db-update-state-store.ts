import { AnimeDbFacade } from "@nimlat/database";
import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	type AnimeDbUpdateCursor,
	resolveCooldownEndsAt,
	toStoredProviderUpdatedAt,
	UPDATE_STATE_VERSION,
} from "./anime-db-update-policy";

export function createAnimeDbUpdateRunState(input: {
	cursor: AnimeDbUpdateCursor;
	progress: AnimeDbUpdateProgressData;
	status: AnimeDbUpdateState["lastRunStatus"];
	errorMessage?: string | null;
	updatedAt: number;
}): AnimeDbUpdateState {
	return {
		version:                         UPDATE_STATE_VERSION,
		lastSuccessfulProviderUpdatedAt: toStoredProviderUpdatedAt(input.cursor.lastSuccessfulProviderUpdatedAt),
		lastKnownTailPage:               input.cursor.lastKnownTailPage,
		lastSuccessfulRunCompletedAt:    input.cursor.lastSuccessfulRunCompletedAt,
		lastRunStatus:                   input.status,
		startedAt:                       input.progress.startedAt ?? null,
		errorMessage:                    input.errorMessage ?? null,
		updatedAt:                       input.updatedAt,
	};
}

export function createCompletedAnimeDbUpdateState(input: {
	lastSuccessfulProviderUpdatedAt: number | null;
	lastKnownTailPage: number;
	completedAt: number;
	startedAt?: number | null;
}): AnimeDbUpdateState {
	return {
		version:                         UPDATE_STATE_VERSION,
		lastSuccessfulProviderUpdatedAt: input.lastSuccessfulProviderUpdatedAt,
		lastKnownTailPage:               input.lastKnownTailPage,
		lastSuccessfulRunCompletedAt:    input.completedAt,
		lastRunStatus:                   "completed",
		startedAt:                       input.startedAt ?? null,
		errorMessage:                    null,
		updatedAt:                       input.completedAt,
	};
}

export function applyStoredAnimeDbUpdateStateToIdleProgress(
	currentProgress: AnimeDbUpdateProgressData,
	state: AnimeDbUpdateState,
): AnimeDbUpdateProgressData {
	const status = state.lastRunStatus === "running" ? "paused" : state.lastRunStatus;
	return {
		...currentProgress,
		status,
		phase:                           status === "completed" ? "completed" : "idle",
		lastSuccessfulProviderUpdatedAt: state.lastSuccessfulProviderUpdatedAt,
		lastSuccessfulRunCompletedAt:    state.lastSuccessfulRunCompletedAt ?? undefined,
		cooldownEndsAt:                  resolveCooldownEndsAt(state) ?? undefined,
		startedAt:                       state.startedAt ?? undefined,
		completedAt:                     state.lastSuccessfulRunCompletedAt ?? undefined,
		errorMessage:                    state.errorMessage ?? undefined,
	};
}

export function loadAnimeDbUpdateStateSafely(): AnimeDbUpdateState | null {
	try {
		return AnimeDbFacade.scanState.loadAnimeDbUpdateState();
	} catch {
		// The facade logged the corrupt/unreadable state; callers can fall back to the baseline-derived cursor.
		return null;
	}
}

export function saveAnimeDbUpdateStateSafely(state: AnimeDbUpdateState): void {
	try {
		AnimeDbFacade.scanState.saveAnimeDbUpdateState(state);
	} catch {
		// The facade has already logged the DB error. Replaying the old cursor is safer than aborting local writes.
	}
}
