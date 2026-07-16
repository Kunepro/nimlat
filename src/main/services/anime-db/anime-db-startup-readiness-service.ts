import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import type { AnimeDbStartupReadiness } from "@nimlat/types/ipc-payloads";

function getConfiguredAnimeDbVersionSafely(): string | null {
	try {
		return UserDbFacade.config.getAnimeDbVersion() ?? null;
	} catch {
		return null;
	}
}

function withVersion(readiness: Omit<AnimeDbStartupReadiness, "animeDbVersion">): AnimeDbStartupReadiness {
	return {
		...readiness,
		animeDbVersion: getConfiguredAnimeDbVersionSafely(),
	};
}

export function getAnimeDbStartupReadiness(): AnimeDbStartupReadiness {
	try {
		const facts = AnimeDbFacade.metadata.getStartupReadinessFacts();
		if (!facts.hasRequiredSchema) {
			return withVersion({
				status:                 "missing_schema",
				canUseLocalCatalog:     false,
				shouldDownloadBaseline: true,
				message:                `AnimeDB schema is incomplete (${ facts.missingTables.join(", ") }).`,
			});
		}

		if (facts.hasCatalogMedia && facts.hasCatalogGroups) {
			return withVersion({
				status:                 "ready",
				canUseLocalCatalog:     true,
				shouldDownloadBaseline: false,
				message:                "AnimeDB is ready.",
			});
		}

		// A configured version is not enough: after the DB file is deleted, init creates an empty schema.
		// Startup must treat that empty attachment as missing baseline content and fetch the official DB again.
		return withVersion({
			status:                 "empty",
			canUseLocalCatalog:     false,
			shouldDownloadBaseline: true,
			message:                "AnimeDB baseline content is missing.",
		});
	} catch (error) {
		return withVersion({
			status:                 "unavailable",
			canUseLocalCatalog:     false,
			shouldDownloadBaseline: true,
			message:                error instanceof Error ? error.message : String(error),
		});
	}
}
