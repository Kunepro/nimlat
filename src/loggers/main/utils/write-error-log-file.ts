import { writeFileSync } from "fs";
import { formatConsoleLog } from "./format-console-log";

export function writeErrorLogFile(log: string, fileName: string, error: Error) {
	try {
		writeFileSync(
			fileName,
			log,
		);

		console.error(formatConsoleLog(log));
	} catch (logFileError) {
		console.error(
			"Critical error: Failed to write error log file",
			{
				error,
				fileName,
				logFileError,
			},
		);
	}
}
