import type { ErrorWithResponse } from "@nimlat/functions";
import { exponentialBackoffSeconds } from "@nimlat/functions";

export interface AniListRateLimitDelayInput {
	error: ErrorWithResponse;
	consecutiveRateLimitCount: number;
	defaultRetryAfterSeconds: number;
	maxBackoffSeconds: number;
}

export function resolveAniListRateLimitDelaySeconds({
																											error,
																											consecutiveRateLimitCount,
																											defaultRetryAfterSeconds,
																											maxBackoffSeconds,
																										}: AniListRateLimitDelayInput): number {
	const retryAfter     = getRetryAfterSeconds(error) ?? defaultRetryAfterSeconds;
	const backoffSeconds = exponentialBackoffSeconds({
		baseSeconds: defaultRetryAfterSeconds,
		maxSeconds:  maxBackoffSeconds,
		attempt:     consecutiveRateLimitCount - 1,
	});

	return Math.max(
		retryAfter,
		backoffSeconds,
	);
}

export function getRetryAfterSeconds(error: ErrorWithResponse): number | null {
	const headers = error.response?.headers;
	if (!headers) {
		return null;
	}

	const value = headers[ "retry-after" ] ?? headers[ "Retry-After" ] ?? headers[ "Retry-after" ];
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(
			value,
			10,
		);
		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return null;
}
