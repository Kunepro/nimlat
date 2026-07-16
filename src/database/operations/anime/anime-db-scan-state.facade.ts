import type {
	AnimeDbUpdateBaseline,
	AnimeDbUpdateState,
} from "@nimlat/types/anime-db-update";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	AnimeDbScanCheckpoint,
	clearAnimeDbScanCheckpoint,
	loadAnimeDbScanCheckpoint,
	saveAnimeDbScanCheckpoint,
} from "./scan-state/anime-db-scan-checkpoint";
import {
	loadAnimeDbUpdateState,
	saveAnimeDbUpdateState,
	selectAnimeDbUpdateBaseline,
} from "./scan-state/anime-db-update-state";

// Scan-state facade panel for resumable AnimeDB population/update cursors.
export const AnimeDbScanStateFacade = {
	saveAnimeDbScanCheckpoint(checkpoint: AnimeDbScanCheckpoint): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.saveAnimeDbScanCheckpoint",
			() => saveAnimeDbScanCheckpoint(checkpoint),
		);
	},

	loadAnimeDbScanCheckpoint(): AnimeDbScanCheckpoint | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.loadAnimeDbScanCheckpoint",
			() => loadAnimeDbScanCheckpoint(),
		);
	},

	clearAnimeDbScanCheckpoint(): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.clearAnimeDbScanCheckpoint",
			() => clearAnimeDbScanCheckpoint(),
		);
	},

	saveAnimeDbUpdateState(state: AnimeDbUpdateState): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.saveAnimeDbUpdateState",
			() => saveAnimeDbUpdateState(state),
		);
	},

	loadAnimeDbUpdateState(): AnimeDbUpdateState | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.loadAnimeDbUpdateState",
			() => loadAnimeDbUpdateState(),
		);
	},

	getAnimeDbUpdateBaseline(): AnimeDbUpdateBaseline {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.scanState.getAnimeDbUpdateBaseline",
			() => selectAnimeDbUpdateBaseline(),
		);
	},
} as const;
