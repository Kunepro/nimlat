import { typeSafeError } from "@nimlat/functions";
import { debug } from "../config/debugging";
import { inspectUserGroupingDiagnostics } from "./inspect-user-grouping-diagnostics";

type GroupingDiagnosticsLogger = (
	context: string,
	error: Error,
	details?: Record<string, unknown>,
) => void;

let groupingDiagnosticsLogger: GroupingDiagnosticsLogger | null = null;

export function setGroupingDiagnosticsLogger(logger: GroupingDiagnosticsLogger | null): void {
	groupingDiagnosticsLogger = logger;
}

// Grouping diagnostics are a debug-only safety net for mutation flows. Keeping
// the trigger in the grouping domain preserves the guardrail without coupling
// DB operation modules to Electron-only logger initialization.
export function logGroupingDiagnosticsIfDebuggingEnabled(context: string): void {
	if (!debug()) {
		return;
	}

	try {
		const diagnostics = inspectUserGroupingDiagnostics();
		if (!diagnostics.hasIssues) {
			return;
		}

		groupingDiagnosticsLogger?.(
			"user-db.grouping.diagnostics",
			new Error(`Grouping diagnostics reported consistency issues after ${ context }.`),
			{
				context,
				issueLabels:          diagnostics.issueLabels,
				state:                {
					groupingMode:                 diagnostics.state.groupingMode,
					forkedFromAnimeDbVersion:     diagnostics.state.forkedFromAnimeDbVersion,
					lastReconciledAnimeDbVersion: diagnostics.state.lastReconciledAnimeDbVersion,
					lastReconcileStatus:          diagnostics.state.lastReconcileStatus,
				},
				latestReconcileRunId: diagnostics.latestReconcileRun?.id ?? null,
			},
		);
	} catch (error) {
		groupingDiagnosticsLogger?.(
			"user-db.grouping.diagnostics.inspect",
			typeSafeError(error),
			{ context },
		);
	}
}
