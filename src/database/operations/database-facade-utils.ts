import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";

// Shared DB-facade guardrail: facade panels stay thin, while every DB boundary
// logs and rethrows persistence failures before callers can continue.
export function runDatabaseFacadeOperation<T>(
	context: string,
	operation: () => T,
	details?: Record<string, unknown>,
): T {
	try {
		return operation();
	} catch (error) {
		LoggerUtils.logMainServiceError(
			context,
			typeSafeError(error),
			details,
		);
		throw error;
	}
}
