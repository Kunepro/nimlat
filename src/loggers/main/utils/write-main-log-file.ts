import { writeFileSync } from "fs";
import { formatConsoleLog } from "./format-console-log";

type MainLogLevel =
	| "info"
	| "warning";

// Persist one debug-gated operational main-process log to disk and mirror it to the
// matching console level. This keeps the file+console contract centralized so callers
// only choose the semantic level, not the transport behavior.
export function writeMainLogFile(
	log: string,
	fileName: string,
	level: MainLogLevel,
	details?: Record<string, unknown>,
): void {
	try {
		writeFileSync(
			fileName,
			log,
		);

		const consoleLog = formatConsoleLog(log);
		if (level === "warning") {
			if (details) {
				console.warn(
					consoleLog,
					details,
				);
			} else {
				console.warn(consoleLog);
			}
			return;
		}

		if (details) {
			console.info(
				consoleLog,
				details,
			);
		} else {
			console.info(consoleLog);
		}
	} catch (logFileError) {
		console.error(
			"Critical error: Failed to write main log file",
			{
				fileName,
				level,
				logFileError,
			},
		);
	}
}
