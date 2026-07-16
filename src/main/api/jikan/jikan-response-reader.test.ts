import {
	describe,
	expect,
	it,
} from "vitest";
import { JikanMalformedPayloadError } from "./jikan-errors";
import {
	readJikanHttpErrorDetails,
	readJikanSuccessPayload,
	truncateJikanBody,
} from "./jikan-response-reader";

describe(
	"jikan response reader",
	() => {
		it(
			"trims and truncates raw provider bodies",
			() => {
				expect(truncateJikanBody("  hello  ")).toBe("hello");
				expect(truncateJikanBody("   ")).toBeNull();
				expect(truncateJikanBody("x".repeat(1_050))).toHaveLength(1_000);
			},
		);

		it(
			"preserves HTTP error details",
			async () => {
				const response = new Response(
					" rate limited ",
					{
						status:     429,
						statusText: "Too Many Requests",
						headers:    {
							"retry-after": "2",
							"x-provider":  "jikan",
						},
					},
				);

				await expect(readJikanHttpErrorDetails(
					response,
					"https://api.jikan.moe/test",
				)).resolves.toEqual({
					url:        "https://api.jikan.moe/test",
					statusText: "Too Many Requests",
					retryAfter: "2",
					headers:    expect.objectContaining({
						"retry-after": "2",
						"x-provider":  "jikan",
					}),
					body:       "rate limited",
				});
			},
		);

		it(
			"reads valid success JSON with response details",
			async () => {
				const response = new Response(
					JSON.stringify({ data: [] }),
					{
						status:     200,
						statusText: "OK",
					},
				);

				await expect(readJikanSuccessPayload(
					response,
					"https://api.jikan.moe/test",
					"episodes",
					123,
					1,
				)).resolves.toEqual({
					payload: { data: [] },
					details: expect.objectContaining({
						url:        "https://api.jikan.moe/test",
						statusText: "OK",
						body:       "{\"data\":[]}",
					}),
				});
			},
		);

		it(
			"throws structured malformed errors for invalid success JSON",
			async () => {
				const response = new Response(
					"{ nope",
					{
						status:     200,
						statusText: "OK",
					},
				);

				await expect(readJikanSuccessPayload(
					response,
					"https://api.jikan.moe/test",
					"episodes",
					123,
					1,
				)).rejects.toBeInstanceOf(JikanMalformedPayloadError);
			},
		);
	},
);
