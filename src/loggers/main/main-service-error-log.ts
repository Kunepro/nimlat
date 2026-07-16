import {
	formatDetailsLines,
	getUpstreamErrorDetails,
} from "./logger-detail-formatting";
import { generateLogFileName } from "./utils/generate-log-file-name";
import { writeErrorLogFile } from "./utils/write-error-log-file";

export function writeMainServiceErrorLog(
	context: string,
	error: Error,
	details?: Record<string, unknown>,
): string {
	const timestamp    = Date.now();
	const detailsLines = formatDetailsLines({
		...details,
		...getUpstreamErrorDetails(error),
	});
	const log          = [
		"[main-service-error]",
		`context: ${ context }`,
		`timestamp: ${ timestamp }`,
		`iso: ${ new Date(timestamp).toISOString() }`,
		...detailsLines,
		`message: ${ error.message }`,
		`stack: ${ error.stack || "n/a" }`,
	].join("\n");

	const fileName = generateLogFileName(
		"main-service-error",
		timestamp,
	);
	writeErrorLogFile(
		log,
		fileName,
		error,
	);

	return log;
}

export function writeMainInitializationErrorLog(error: Error): string {
	const timestamp = Date.now();
	const log       = [
		"[main-initialization-error]",
		`timestamp: ${ timestamp }`,
		`iso: ${ new Date(timestamp).toISOString() }`,
		`message: ${ error.message }`,
		`stack: ${ error.stack || "n/a" }`,
	].join("\n");

	const fileName = generateLogFileName(
		"main-initialization-error",
		timestamp,
	);
	writeErrorLogFile(
		log,
		fileName,
		error,
	);

	return log;
}
