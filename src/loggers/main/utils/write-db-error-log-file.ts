import { writeFileSync } from "fs";
import { formatConsoleLog } from "./format-console-log";

export function writeDbErrorLogFile(log: string, fileName: string, dbError: Error, additionalError?: Error) {
	try {
		writeFileSync(
			fileName,
			log,
		);

		console.error(formatConsoleLog(log));
	} catch (logFileError) {
		console.error(
			"Critical error: Failed to write database error log file",
			{
				dbError,
				fileName,
				logFileError,
				additionalError,
			},
		);
	}
}
