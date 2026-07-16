import type { ProviderRequestPriority } from "@nimlat/types/provider-clients";
import {
	getUpstreamErrorDetails,
	stringifyLogValue,
} from "./logger-detail-formatting";
import { generateLogFileName } from "./utils/generate-log-file-name";
import { writeErrorLogFile } from "./utils/write-error-log-file";

export interface AniListRateLimiterErrorContext {
	message: string;
	retryAfterSeconds?: number;
	priority?: ProviderRequestPriority;
	queueSizeManual?: number;
	queueSizeSeriesHydration?: number;
	queueSizeMediaData?: number;
	queueSizeBackground?: number;
	requestAgeMs?: number;
	operation?: string;
	queue?: string;
	mediaId?: number;
	idAniList?: number;
	page?: number;
	perPage?: number;
	sort?: string[];
	source?: string;
	recovery?: string;
}

// Writes a rate limiter error log to disk. Use this for unexpected failures
// in the AniList request pipeline.
// noinspection OverlyComplexFunctionJS
export function writeAniListRateLimiterErrorLog(
	error: Error,
	context: AniListRateLimiterErrorContext,
): string {
	const timestamp = Date.now();
	const log       = [
		"=== AniList Rate Limiter Error ===",
		`Timestamp: ${ new Date(timestamp).toISOString() }`,
		`Message: ${ context.message }`,
		context.priority ? `Priority: ${ context.priority }` : undefined,
		context.retryAfterSeconds === undefined ? undefined : `RetryAfterSeconds: ${ context.retryAfterSeconds }`,
		context.queueSizeManual === undefined ? undefined : `QueueManual: ${ context.queueSizeManual }`,
		context.queueSizeSeriesHydration === undefined
			? undefined
			: `QueueSeriesHydration: ${ context.queueSizeSeriesHydration }`,
		context.queueSizeMediaData === undefined ? undefined : `QueueMediaData: ${ context.queueSizeMediaData }`,
		context.queueSizeBackground === undefined ? undefined : `QueueBackground: ${ context.queueSizeBackground }`,
		context.requestAgeMs === undefined ? undefined : `RequestAgeMs: ${ context.requestAgeMs }`,
		context.operation ? `Operation: ${ context.operation }` : undefined,
		context.queue ? `Queue: ${ context.queue }` : undefined,
		context.mediaId === undefined ? undefined : `MediaId: ${ context.mediaId }`,
		context.idAniList === undefined ? undefined : `AniListId: ${ context.idAniList }`,
		context.page === undefined ? undefined : `Page: ${ context.page }`,
		context.perPage === undefined ? undefined : `PerPage: ${ context.perPage }`,
		context.sort ? `Sort: ${ stringifyLogValue(context.sort) }` : undefined,
		context.source ? `Source: ${ context.source }` : undefined,
		context.recovery ? `Recovery: ${ context.recovery }` : undefined,
		...Object.entries(getUpstreamErrorDetails(error)).map(([ key, value ]) => `${ key }: ${ stringifyLogValue(value) }`),
		`Error: ${ error.message }`,
		error.stack || "",
	]
		.filter((line) => line !== undefined)
		.join("\n");

	const fileName = generateLogFileName(
		"ani-list-rate-limiter-error",
		timestamp,
	);
	writeErrorLogFile(
		log,
		fileName,
		error,
	);

	return log;
}
