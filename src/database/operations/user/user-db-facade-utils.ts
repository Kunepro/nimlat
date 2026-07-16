import { runDatabaseFacadeOperation } from "../database-facade-utils";

// Shared DB-facade guardrail: facades remain thin, but every DB boundary must
// log and rethrow failures so callers never proceed from swallowed persistence errors.
export function runUserDbFacadeOperation<T>(
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
