import { runDatabaseFacadeOperation } from "../database-facade-utils";

// Shared AnimeDB facade guardrail: facade panels only route to DB operations,
// while this helper centralizes the required log-and-rethrow behavior.
export function runAnimeDbFacadeOperation<T>(
	context: string,
	operation: () => T,
	details?: Record<string, unknown>,
): T {
	return runDatabaseFacadeOperation(
		context,
		operation,
		details,
	);
}
