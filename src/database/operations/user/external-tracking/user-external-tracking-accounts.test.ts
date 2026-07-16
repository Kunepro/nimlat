// @vitest-environment node
import type { Database } from "better-sqlite3";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	selectExternalTrackingAccounts,
	updateExternalTrackingAccountSecrets,
} from "./user-external-tracking-accounts";

interface SecretColumns {
	accessToken: string | null;
	refreshToken: string | null;
	pendingCodeVerifier: string | null;
}

const databaseHolder = vi.hoisted(() => ({ current: null as Database | null }));
const rows           = new Map<string, SecretColumns>();

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: () => {
			if (!databaseHolder.current) {
				throw new Error("Test database is not initialized.");
			}

			return databaseHolder.current;
		},
	}),
);

// The project native module targets Electron, not the Node runtime used by Vitest.
// This focused double preserves better-sqlite3 transaction rollback semantics.
function createDatabaseDouble(): Database {
	return {
		prepare:     () => ({
			run: (
						 accessToken: string | null,
				     refreshToken: string | null,
				     pendingCodeVerifier: string | null,
				     provider: string,
					 ) => {
				if (!rows.has(provider)) {
					return { changes: 0 };
				}

				rows.set(
					provider,
					{
						accessToken,
						refreshToken,
						pendingCodeVerifier,
					},
				);
				return { changes: 1 };
			},
		}),
		transaction: (operation: (accounts: unknown[]) => void) => (accounts: unknown[]) => {
			const snapshot = new Map(Array.from(
				rows,
				([ provider, secrets ]) => [
					provider,
					{ ...secrets },
				],
			));
			try {
				operation(accounts);
			} catch (error: unknown) {
				rows.clear();
				for (const [ provider, secrets ] of snapshot) {
					rows.set(
						provider,
						secrets,
					);
				}
				throw error;
			}
		},
	} as unknown as Database;
}

describe(
	"external tracking account secret updates",
	() => {
		beforeEach(() => {
			rows.clear();
			rows.set(
				"anilist",
				{
					accessToken:         "plain-access",
					refreshToken:        "plain-refresh",
					pendingCodeVerifier: "plain-verifier",
				},
			);
			databaseHolder.current = createDatabaseDouble();
		});

		it(
			"rolls back every credential column when any account update fails",
			() => {
				expect(() => updateExternalTrackingAccountSecrets([
					{
						provider:            "anilist",
						accessToken:         "protected-access",
						refreshToken:        "protected-refresh",
						pendingCodeVerifier: "protected-verifier",
					},
					{
						provider:            "mal",
						accessToken:         "protected-mal",
						refreshToken:        null,
						pendingCodeVerifier: null,
					},
				])).toThrow(/Failed to protect mal/u);

				expect(rows.get("anilist")).toEqual({
					accessToken:         "plain-access",
					refreshToken:        "plain-refresh",
					pendingCodeVerifier: "plain-verifier",
				});
			},
		);

		it(
			"maps persisted provider account activity",
			() => {
				const prepare          = vi.fn(() => ({
					all: () => [
						{
							provider:                "kitsu",
							status:                  "available",
							authKind:                "password",
							clientId:                null,
							accessToken:             null,
							refreshToken:            null,
							tokenExpiresAt:          null,
							publicProfileIdentifier: "saved-kitsu-user",
							pendingCodeVerifier:     null,
							pendingState:            null,
							pendingRedirectUri:      null,
							lastImportedAt:          123_456,
							lastError:               null,
							updatedAt:               123_456,
						},
					],
				}));
				databaseHolder.current = { prepare } as unknown as Database;

				expect(selectExternalTrackingAccounts()).toEqual([
					expect.objectContaining({
						provider:                "kitsu",
						status:                  "available",
						publicProfileIdentifier: "saved-kitsu-user",
						lastImportedAt:          123_456,
					}),
				]);
			},
		);
	},
);
