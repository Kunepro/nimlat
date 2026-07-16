import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type {
	ExternalTrackingEpisodeState,
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
	ExternalTrackingPushItem,
} from "@nimlat/types/external-tracking";
import {
	asArray,
	asNumber,
	asRecord,
	asString,
	fetchJson,
	parseIsoDate,
	requireAccessToken,
} from "./external-tracking-client-utils";
import type { ExternalTrackingProviderClient } from "./external-tracking-providers";

interface SimklIds {
	simkl?: unknown;
	mal?: unknown;
	anilist?: unknown;
	kitsu?: unknown;
}

export class SimklTrackingClient implements ExternalTrackingProviderClient {
	provider: ExternalTrackingProvider = "simkl";

	async importWatched(account: ExternalTrackingAccountSecretRow): Promise<ExternalTrackingImportedMedia[]> {
		const token    = requireAccessToken(account);
		const clientId = requireSimklClientId(account);

		const payload = asRecord(await fetchJson(
			"https://api.simkl.com/sync/all-items/anime?extended=full&include_all_episodes=yes&episode_watched_at=yes",
			{
				headers: {
					Authorization:   `Bearer ${ token }`,
					"simkl-api-key": clientId,
				},
			},
		));
		return asArray(payload.anime).map((entry): ExternalTrackingImportedMedia | null => {
			const row             = asRecord(entry);
			const show = asRecord(row.show);
			// Current Simkl responses nest catalog identifiers under show.ids. Keep the
			// top-level fallback for older payloads, but never rely on localized titles.
			const ids                     = asRecord(show.ids ?? row.ids) as SimklIds;
			const reportedWatchedEpisodes = asNonNegativeInteger(row.watched_episodes_count)
				?? asNonNegativeInteger(row.watched_episodes)
				?? 0;
			const episodesCount           = asNonNegativeInteger(row.total_episodes_count)
				?? asNonNegativeInteger(row.episodes);
			const status                  = asString(row.status)?.trim().toLowerCase() ?? null;
			const episodeStates           = readSimklEpisodeStates(row);
			const isWatched               = status === "completed";
			const watchedEpisodes         = isWatched
				? episodesCount ?? reportedWatchedEpisodes
				: episodeStates.filter(state => state.isWatched).length;
			const idSimkl         = asNumber(ids.simkl)?.toString() ?? asString(ids.simkl);
			const idMal                   = asNumericProviderId(ids.mal);
			const idAniList               = asNumericProviderId(ids.anilist);
			if (!idSimkl && !idMal && !idAniList) {
				return null;
			}

			return {
				providerMediaId: idSimkl ?? idMal?.toString() ?? idAniList?.toString() ?? "",
				idSimkl,
				idMal,
				idAniList,
				idKitsu:             asNumber(ids.kitsu)?.toString() ?? asString(ids.kitsu),
				isWatched,
				watchedEpisodeCount: watchedEpisodes,
				episodeStates,
				episodesCount,
				watchedAt:           parseIsoDate(row.last_watched_at),
				rawStatus:       status,
			};
		}).filter((item): item is ExternalTrackingImportedMedia => item !== null);
	}

	async pushWatchedBatch(account: ExternalTrackingAccountSecretRow, items: ExternalTrackingPushItem[]): Promise<void> {
		const token    = requireAccessToken(account);
		const clientId = requireSimklClientId(account);

		const resetAnime = items
			.filter(item => !item.isWatched)
			.map(item => ({
				ids: {
					simkl:   item.idSimkl ? Number(item.idSimkl) : undefined,
					mal:     item.idMal ?? undefined,
					anilist: item.idAniList ?? undefined,
					kitsu:   item.idKitsu ? Number(item.idKitsu) : undefined,
				},
			}));
		// SIMKL history addition cannot express zero watched episodes. Its paired
		// remove endpoint is the inverse operation and returns the title to an
		// unwatched/list state instead of silently accepting no work.
		if (resetAnime.length > 0) {
			await fetchJson(
				"https://api.simkl.com/sync/history/remove",
				{
					method:  "POST",
					headers: {
						Authorization:   `Bearer ${ token }`,
						"Content-Type":  "application/json",
						"simkl-api-key": clientId,
					},
					body:    JSON.stringify({ anime: resetAnime }),
				},
			);
		}

		const watchedAnime = items
			.map(item => ({
				item,
				watchedEpisodeNumbers: getWatchedEpisodeNumbers(item),
			}))
			.filter(({
								 item,
								 watchedEpisodeNumbers,
							 }) => item.isWatched || watchedEpisodeNumbers.length > 0)
			.map(({
							item,
							watchedEpisodeNumbers,
						}) => ({
				ids:      {
					simkl:   item.idSimkl ? Number(item.idSimkl) : undefined,
					mal:     item.idMal ?? undefined,
					anilist: item.idAniList ?? undefined,
					kitsu:   item.idKitsu ? Number(item.idKitsu) : undefined,
				},
				episodes: item.isWatched ? undefined : watchedEpisodeNumbers,
			}));
		if (watchedAnime.length === 0) {
			return;
		}

		await fetchJson(
			"https://api.simkl.com/sync/history",
			{
				method:  "POST",
				headers: {
					Authorization:   `Bearer ${ token }`,
					"Content-Type":  "application/json",
					"simkl-api-key": clientId,
				},
				body: JSON.stringify({ anime: watchedAnime }),
			},
		);
	}
}

function requireSimklClientId(account: ExternalTrackingAccountSecretRow): string {
	if (!account.clientId) {
		throw new Error("Simkl account is missing a client ID.");
	}

	return account.clientId;
}

function readSimklEpisodeStates(row: Record<string, unknown>): ExternalTrackingEpisodeState[] {
	const stateByEpisodeNumber = new Map<number, ExternalTrackingEpisodeState>();
	for (const seasonValue of asArray(row.seasons)) {
		const season = asRecord(seasonValue);
		for (const episodeValue of asArray(season.episodes)) {
			const episode       = asRecord(episodeValue);
			const episodeNumber = asPositiveInteger(episode.number);
			if (!episodeNumber) continue;
			const watchedAt = parseIsoDate(episode.watched_at);
			const state     = {
				episodeNumber,
				isWatched: watchedAt !== null,
				watchedAt,
			};
			const current   = stateByEpisodeNumber.get(episodeNumber);
			// Anime episodes use their canonical episode number. If Simkl repeats an
			// entry, positive watched evidence wins without inventing ordering.
			if (!current?.isWatched || state.isWatched) {
				stateByEpisodeNumber.set(
					episodeNumber,
					state,
				);
			}
		}
	}
	return Array.from(stateByEpisodeNumber.values()).sort((left, right) => left.episodeNumber - right.episodeNumber);
}

// Simkl serializes external catalog IDs inconsistently across endpoints, so
// normalize both JSON numbers and digit-only strings before matching AnimeDB.
function asNumericProviderId(value: unknown): number | null {
	const numericValue = asNonNegativeInteger(value);
	return numericValue !== null && numericValue > 0 ? numericValue : null;
}

function asPositiveInteger(value: unknown): number | null {
	const numericValue = asNonNegativeInteger(value);
	return numericValue !== null && numericValue > 0 ? numericValue : null;
}

function getWatchedEpisodeNumbers(item: ExternalTrackingPushItem): number[] {
	return Array.from(new Set((item.episodeStates ?? [])
		.filter(state => state.isWatched && Number.isInteger(state.episodeNumber) && state.episodeNumber > 0)
		.map(state => state.episodeNumber)))
		.sort((left, right) => left - right);
}

// Counts are documented as JSON integers, but accepting digit-only strings
// prevents a provider serialization difference from erasing watched evidence.
function asNonNegativeInteger(value: unknown): number | null {
	const numericValue = asNumber(value);
	if (numericValue !== null) {
		return Number.isSafeInteger(numericValue) && numericValue >= 0 ? numericValue : null;
	}

	const textValue = asString(value);
	if (!textValue || !/^\d+$/.test(textValue)) {
		return null;
	}

	const parsedValue = Number(textValue);
	return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}
