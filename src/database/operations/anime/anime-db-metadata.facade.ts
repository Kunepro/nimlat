import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { selectAnimeDbReadinessFacts } from "./metadata/select-anime-db-readiness-facts";
import {
	assertAnimeDbFileReconcileSafety,
	repairAndAssertAttachedAnimeDbReconcileSafety,
} from "./metadata/validate-anime-db-reconcile-safety";

// Metadata facade panel for AnimeDB safety/readiness checks. Schema policy and
// repair rules remain in metadata operations, not in this public control panel.
export const AnimeDbMetadataFacade = {
	assertAttachedReconcileSafety() {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.metadata.assertAttachedReconcileSafety",
			() => repairAndAssertAttachedAnimeDbReconcileSafety(),
		);
	},

	assertFileReconcileSafety(filePath: string) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.metadata.assertFileReconcileSafety",
			() => assertAnimeDbFileReconcileSafety(filePath),
			{ filePath },
		);
	},

	getStartupReadinessFacts() {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.metadata.getStartupReadinessFacts",
			() => selectAnimeDbReadinessFacts(),
		);
	},
} as const;
