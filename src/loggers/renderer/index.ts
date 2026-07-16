import { writeFileSync } from "fs";

export function writeErrorLogFile(log: string, fileName: string, error: Error) {
	try {
		writeFileSync(
			fileName,
			log,
		);

		console.error(log);
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
