// @vitest-environment node
import type { ErrorWithResponse } from "@nimlat/functions";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	getRetryAfterSeconds,
	resolveAniListRateLimitDelaySeconds,
} from "./ani-list-rate-limit-policy";

function rateLimitError(headers?: Record<string, string | number | undefined>): ErrorWithResponse {
	return {
		message:  "rate limited",
		name:     "Error",
		response: {
			headers,
			status: 429,
		},
	};
}

describe(
	"ani-list rate-limit policy",
	() => {
		it(
			"reads Retry-After values from common header casings",
			() => {
				expect(getRetryAfterSeconds(rateLimitError({ "retry-after": "12" }))).toBe(12);
				expect(getRetryAfterSeconds(rateLimitError({ "Retry-After": 9 }))).toBe(9);
				expect(getRetryAfterSeconds(rateLimitError({ "Retry-after": "0" }))).toBeNull();
			},
		);

		it(
			"uses the larger of Retry-After and exponential backoff",
			() => {
				expect(resolveAniListRateLimitDelaySeconds({
					consecutiveRateLimitCount: 1,
					defaultRetryAfterSeconds:  5,
					error:                     rateLimitError({ "retry-after": "30" }),
					maxBackoffSeconds:         60,
				})).toBe(30);

				expect(resolveAniListRateLimitDelaySeconds({
					consecutiveRateLimitCount: 4,
					defaultRetryAfterSeconds:  5,
					error:                     rateLimitError(),
					maxBackoffSeconds:         60,
				})).toBeGreaterThan(5);
			},
		);
	},
);
