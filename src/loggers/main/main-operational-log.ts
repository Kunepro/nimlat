import { formatDetailsLines } from "./logger-detail-formatting";
import { generateLogFileName } from "./utils/generate-log-file-name";
import { writeMainLogFile } from "./utils/write-main-log-file";

type MainOperationalLogLevel =
	| "info"
	| "warning";

interface MainOperationalLogOptions {
	context: string;
	message: string;
	details?: Record<string, unknown>;
	level: MainOperationalLogLevel;
}

export function writeMainOperationalLog({
																					context,
																					details,
																					level,
																					message,
																				}: MainOperationalLogOptions): string {
	const timestamp    = Date.now();
	const detailsLines = formatDetailsLines(details);
	const tag          = level === "warning" ? "main-warning" : "main-info";
	const log          = [
		`[${ tag }]`,
		`context: ${ context }`,
		`timestamp: ${ timestamp }`,
		`iso: ${ new Date(timestamp).toISOString() }`,
		`message: ${ message }`,
		...detailsLines,
	].join("\n");

	const fileName = generateLogFileName(
		tag,
		timestamp,
	);
	writeMainLogFile(
		log,
		fileName,
		level,
		details,
	);

	return log;
}
