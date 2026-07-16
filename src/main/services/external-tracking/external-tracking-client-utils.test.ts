// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	asArray,
	asNumber,
	asRecord,
	asString,
	fetchJson,
	parseIsoDate,
	requireAccessToken,
} from "./external-tracking-client-utils";

function createAccount(accessToken: string | null): ExternalTrackingAccountSecretRow {
	return {
		provider:            "anilist",
		status:              "connected",
		authKind:            "implicit",
		clientId:            null,
		accessToken,
		refreshToken:        null,
		tokenExpiresAt:      null,
		publicProfileIdentifier: null,
		pendingCodeVerifier: null,
		pendingState:        null,
		pendingRedirectUri:  null,
		lastImportedAt:      null,
		lastError:           null,
		updatedAt:           1,
	};
}

describe(
	"external-tracking-client-utils",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"normalizes provider payload primitives defensively",
			() => {
				expect(asRecord({ id: 1 })).toEqual({ id: 1 });
				expect(asRecord(null)).toEqual({});
				expect(asArray([ 1 ])).toEqual([ 1 ]);
				expect(asArray("not-array")).toEqual([]);
				expect(asNumber(42)).toBe(42);
				expect(asNumber(Number.NaN)).toBeNull();
				expect(asString(" watched ")).toBe(" watched ");
				expect(asString("")).toBeNull();
				expect(parseIsoDate("2026-07-05T07:00:00.000Z")).toBe(Date.parse("2026-07-05T07:00:00.000Z"));
				expect(parseIsoDate("bad-date")).toBeNull();
			},
		);

		it(
			"throws a bounded HTTP error when provider requests fail",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve({
						ok:         false,
						status:     429,
						statusText: "Too Many Requests",
						text:       () => Promise.resolve("x".repeat(3000)),
					} as Response)),
				);

				await expect(fetchJson(
					"https://provider.test",
					{},
				)).rejects.toMatchObject({
					name:    "ExternalTrackingHttpError",
					details: {
						status:     429,
						statusText: "Too Many Requests",
						body:       "x".repeat(2000),
						url:        "https://provider.test",
					},
				});
			},
		);

		it(
			"requires stored access tokens before provider calls",
			() => {
				expect(requireAccessToken(createAccount("token"))).toBe("token");
				expect(() => requireAccessToken(createAccount(null))).toThrow(/missing an access token/u);
			},
		);
	},
);
