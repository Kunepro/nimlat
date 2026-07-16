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
	acknowledgeExternalTrackingPendingExports,
	markExternalTrackingPendingExports,
	selectExternalTrackingPendingExportItems,
} from "./user-external-tracking-pending-exports";

const databaseHolder = vi.hoisted(() => ({ current: null as Database | null }));

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

describe(
	"external tracking pending exports",
	() => {
		beforeEach(() => {
			databaseHolder.current = null;
		});

		it(
			"collapses duplicate media changes and increments each connected provider revision",
			() => {
				const runs: unknown[][] = [];
				const prepare           = vi.fn((sql: string) => {
					expect(sql).toContain("FROM externalTrackingAccounts account");
					expect(sql).toContain("revision = externalTrackingPendingExports.revision + 1");
					return { run: (...params: unknown[]) => runs.push(params) };
				});
				const db                = { prepare } as unknown as Database;

				markExternalTrackingPendingExports(
					db,
					[
						42,
						42,
						55,
					],
					123_456,
				);

				expect(runs).toEqual([
					[
						42,
						123_456,
					],
					[
						55,
						123_456,
					],
				]);
			},
		);

		it(
			"selects a zero-progress unwatched item from the provider dirty set",
			() => {
				const all              = vi.fn(() => [
					{
						mediaId:               42,
						idMal:                 4242,
						isWatched:             0,
						watchedEpisodeCount:   0,
						episodesCount:         12,
						pendingExportRevision: 3,
					},
				]);
				databaseHolder.current = {
					prepare: vi.fn((sql: string) => {
						expect(sql).toContain("FROM externalTrackingPendingExports pending");
						expect(sql).not.toContain("state.isWatched = 1");
						return { all };
					}),
				} as unknown as Database;

				expect(selectExternalTrackingPendingExportItems("mal")).toEqual([
					{
						mediaId:               42,
						idMal:                 4242,
						isWatched:             false,
						watchedEpisodeCount:   0,
						episodesCount:         12,
						pendingExportRevision: 3,
					},
				]);
				expect(all).toHaveBeenCalledWith(
					"mal",
					10_000,
				);
			},
		);

		it(
			"selects exact sparse episode states only for Simkl exports",
			() => {
				const selectPending    = vi.fn(() => [
					{
						mediaId:               42,
						idSimkl:               "1234",
						isWatched:             0,
						watchedEpisodeCount:   2,
						episodesCount:         4,
						pendingExportRevision: 3,
					},
				]);
				const selectEpisodes   = vi.fn(() => [
					{
						mediaId:       42,
						episodeNumber: 1,
						isWatched:     1,
						watchedAt:     100,
					},
					{
						mediaId:       42,
						episodeNumber: 2,
						isWatched:     0,
						watchedAt:     null,
					},
					{
						mediaId:       42,
						episodeNumber: 4,
						isWatched:     1,
						watchedAt:     400,
					},
				]);
				databaseHolder.current = {
					prepare: vi.fn((sql: string) => sql.includes("FROM externalTrackingPendingExports pending")
						? { all: selectPending }
						: { all: selectEpisodes }),
				} as unknown as Database;

				expect(selectExternalTrackingPendingExportItems("simkl")).toEqual([
					{
						mediaId:               42,
						idSimkl:               "1234",
						isWatched:             false,
						watchedEpisodeCount:   2,
						episodesCount:         4,
						pendingExportRevision: 3,
						episodeStates:         [
							{
								episodeNumber: 1,
								isWatched:     true,
								watchedAt:     100,
							},
							{
								episodeNumber: 2,
								isWatched:     false,
								watchedAt:     null,
							},
							{
								episodeNumber: 4,
								isWatched:     true,
								watchedAt:     400,
							},
						],
					},
				]);
				expect(selectEpisodes).toHaveBeenCalledWith(
					"simkl",
					10_000,
				);
			},
		);

		it(
			"acknowledges only the exact revisions that were sent",
			() => {
				const runs: unknown[][] = [];
				databaseHolder.current  = {
					prepare:     vi.fn((sql: string) => {
						expect(sql).toContain("AND revision = ?");
						return {
							run: (...params: unknown[]) => {
								runs.push(params);
								return { changes: 1 };
							},
						};
					}),
					transaction: (operation: () => number) => operation,
				} as unknown as Database;

				expect(acknowledgeExternalTrackingPendingExports(
					"mal",
					[
						{
							mediaId:               42,
							pendingExportRevision: 3,
						},
						{
							mediaId:               55,
							pendingExportRevision: 8,
						},
					],
				)).toBe(2);
				expect(runs).toEqual([
					[
						"mal",
						42,
						3,
					],
					[
						"mal",
						55,
						8,
					],
				]);
			},
		);
	},
);
