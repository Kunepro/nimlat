export type AnimeDbUpdateRunStatus =
	| "idle"
	| "running"
	| "paused"
	| "completed"
	| "error";

export interface AnimeDbUpdateState {
	version: 1;
	lastSuccessfulProviderUpdatedAt: number | null;
	lastKnownTailPage: number | null;
	lastSuccessfulRunCompletedAt: number | null;
	lastRunStatus: AnimeDbUpdateRunStatus;
	startedAt: number | null;
	errorMessage: string | null;
	updatedAt: number;
}

export interface AnimeDbUpdateBaseline {
	mediaCount: number;
	maxProviderUpdatedAt: number | null;
}
