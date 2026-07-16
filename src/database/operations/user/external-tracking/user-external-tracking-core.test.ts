// @vitest-environment node
import type { Database } from "better-sqlite3";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	type EpisodeWatchStateRow,
	type MediaWatchStateRow,
	mergeMediaWatchStateFromImport,
	resolveImportedWatchProgress,
} from "./user-external-tracking-core";

interface RecordedRun {
	args: unknown[];
	statement: string;
}

function createDatabaseDouble(
	current: MediaWatchStateRow | null,
	episodes: EpisodeWatchStateRow[] = [],
): { db: Database; runs: RecordedRun[] } {
	const runs = [] as RecordedRun[];
	const db   = {
		prepare: (statement: string) => {
			if (statement.includes("FROM userMediaWatchStates")) {
				return { get: () => current };
			}
			if (statement.includes("FROM anime_data.episodes") && statement.includes("LEFT JOIN userEpisodeWatchStates")) {
				return { all: () => episodes.map(episode => ({ ...episode })) };
			}
			return {
				run: (...args: unknown[]) => {
					runs.push({
						args,
						statement,
					});
					if (!statement.includes("INSERT INTO userEpisodeWatchStates")) {
						return { changes: 1 };
					}
					const episodeNumber = statement.includes("AND episodeNumber = ?")
						? Number(args[ 3 ])
						: null;
					let changes         = 0;
					for (const episode of episodes) {
						if (episodeNumber !== null && episode.episodeNumber !== episodeNumber) continue;
						if (episode.isWatched !== 1) {
							episode.isWatched = 1;
							changes += 1;
						}
					}
					return { changes };
				},
			};
		},
	} as unknown as Database;

	return {
		db,
		runs,
	};
}

function createEpisodes(...watchedEpisodeNumbers: number[]): EpisodeWatchStateRow[] {
	return [
		1,
		2,
		3,
		4,
	].map(episodeNumber => ({
		episodeId: 20_907_000 + episodeNumber,
		episodeNumber,
		isWatched: watchedEpisodeNumbers.includes(episodeNumber) ? 1 : 0,
	}));
}

describe(
	"mergeMediaWatchStateFromImport",
	() => {
		it(
			"uses aggregate progress only for completed titles",
			() => {
				expect(resolveImportedWatchProgress(
					3,
					true,
					12,
				)).toBe(12);
				expect(resolveImportedWatchProgress(
					15,
					false,
					12,
				)).toBe(0);
				expect(resolveImportedWatchProgress(
					22,
					false,
					null,
					2,
				)).toBe(2);
			},
		);

		it(
			"keeps completed evidence when a later aggregate-only import is partial",
			() => {
				const {
								db,
								runs,
							} = createDatabaseDouble({
					mediaId:             44,
					isWatched:           1,
					watchedEpisodeCount: 12,
					episodesCount:       12,
					watchedAt:           500,
				});

				expect(mergeMediaWatchStateFromImport({
					db,
					episodeStates: [],
					episodesCount: 12,
					isWatched:     false,
					mediaId:       44,
					now:           1_000,
					progress:      3,
					watchedAt:     null,
				})).toEqual({
					changed:              false,
					isWatched:            true,
					changedEpisodeStates: [],
				});
				expect(runs).toHaveLength(0);
			},
		);

		it(
			"ignores partial aggregate progress without episode identities",
			() => {
				const {
								db,
								runs,
							} = createDatabaseDouble(
					null,
					createEpisodes(),
				);

				expect(mergeMediaWatchStateFromImport({
					db,
					episodeStates: [],
					episodesCount: 4,
					isWatched:     false,
					mediaId:       20_907,
					now:           1_000,
					progress:      3,
					watchedAt:     null,
				})).toEqual({
					changed:              false,
					isWatched:            false,
					changedEpisodeStates: [],
				});
				expect(runs).toHaveLength(0);
			},
		);

		it(
			"imports only explicitly identified watched episodes",
			() => {
				const {
								db,
								runs,
							} = createDatabaseDouble(
					null,
					createEpisodes(),
				);

				const result = mergeMediaWatchStateFromImport({
					db,
					episodeStates: [
						{
							episodeNumber: 1,
							isWatched:     true,
						},
						{
							episodeNumber: 2,
							isWatched:     false,
						},
						{
							episodeNumber: 4,
							isWatched:     true,
						},
					],
					episodesCount: 4,
					isWatched:     false,
					mediaId:       20_907,
					now:           1_000,
					progress:      2,
					watchedAt:     null,
				});

				const episodeRuns = runs.filter(run => run.statement.includes("INSERT INTO userEpisodeWatchStates"));
				expect(episodeRuns.map(run => run.args[ 3 ])).toEqual([
					1,
					4,
				]);
				const mediaRun = runs.find(run => run.statement.includes("INSERT INTO userMediaWatchStates"));
				expect(mediaRun?.args).toEqual([
					20_907,
					0,
					2,
					4,
					null,
					1_000,
				]);
				expect(result).toEqual({
					changed:              true,
					isWatched:            false,
					changedEpisodeStates: [
						{
							episodeNumber: 1,
							isWatched:     true,
						},
						{
							episodeNumber: 4,
							isWatched:     true,
						},
					],
				});
			},
		);

		it(
			"ignores explicit episode numbers that do not exist in the local catalog",
			() => {
				const {
								db,
								runs,
							} = createDatabaseDouble(
					null,
					createEpisodes(),
				);

				expect(mergeMediaWatchStateFromImport({
					db,
					episodeStates: [
						{
							episodeNumber: 99,
							isWatched:     true,
						},
					],
					episodesCount: 4,
					isWatched:     false,
					mediaId:       20_907,
					now:           1_000,
					progress:      1,
					watchedAt:     null,
				})).toEqual({
					changed:              false,
					isWatched:            false,
					changedEpisodeStates: [],
				});
				expect(runs.some(run => run.statement.includes("INSERT INTO userMediaWatchStates"))).toBe(false);
			},
		);

		it(
			"marks every catalog episode only for completed media evidence",
			() => {
				const {
								db,
								runs,
							} = createDatabaseDouble(
					null,
					createEpisodes(),
				);

				const result = mergeMediaWatchStateFromImport({
					db,
					episodeStates: [],
					episodesCount: 4,
					isWatched:     true,
					mediaId:       20_907,
					now:           1_000,
					progress:      4,
					watchedAt:     null,
				});

				const fullEpisodeRun = runs.find(run => run.statement.includes("INSERT INTO userEpisodeWatchStates"));
				expect(fullEpisodeRun?.statement).not.toContain("episodeNumber <=");
				expect(result).toEqual({
					changed:              true,
					isWatched:            true,
					changedEpisodeStates: [
						{
							episodeNumber: 1,
							isWatched:     true,
						},
						{
							episodeNumber: 2,
							isWatched:     true,
						},
						{
							episodeNumber: 3,
							isWatched:     true,
						},
						{
							episodeNumber: 4,
							isWatched:     true,
						},
					],
				});
			},
		);
	},
);
