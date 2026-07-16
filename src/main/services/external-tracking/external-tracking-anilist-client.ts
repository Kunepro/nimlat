import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type {
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
	requireAccessToken,
} from "./external-tracking-client-utils";
import type { ExternalTrackingProviderClient } from "./external-tracking-providers";

function readAniListImportedMedia(entry: unknown): ExternalTrackingImportedMedia | null {
	const row       = asRecord(entry);
	const media     = asRecord(row.media);
	const idAniList = asNumber(row.mediaId) ?? asNumber(media.id);
	if (!idAniList) {
		return null;
	}

	const status        = asString(row.status);
	const updatedAt     = asNumber(row.updatedAt) ?? 0;
	const episodesCount = asNumber(media.episodes);
	const isWatched     = status === "COMPLETED";
	return {
		providerMediaId:     idAniList.toString(),
		idAniList,
		idMal:               asNumber(media.idMal),
		isWatched,
		// AniList exposes only an aggregate progress count. It is safe evidence
		// only when COMPLETED means every episode, never as an episode sequence.
		watchedEpisodeCount: isWatched ? episodesCount ?? asNumber(row.progress) ?? 0 : 0,
		episodesCount,
		watchedAt:           updatedAt > 0 ? updatedAt * 1000 : null,
		rawStatus:           status,
	};
}

// AniList needs an explicit inverse status: null would leave a completed entry's
// list status ambiguous even when progress is reset to zero.
function getAniListExportProgress(item: ExternalTrackingPushItem): number {
	if (!item.isWatched) return 0;
	return Math.max(
		0,
		Math.trunc(item.episodesCount ?? item.watchedEpisodeCount),
	);
}

export class AniListTrackingClient implements ExternalTrackingProviderClient {
	provider: ExternalTrackingProvider = "anilist";

	// Pasted implicit-grant tokens have no token exchange step, so validate them
	// with the smallest authenticated AniList request before Nimlat stores them.
	async testConnection(account: ExternalTrackingAccountSecretRow): Promise<void> {
		await this.getViewerId(requireAccessToken(account));
	}

	async importWatched(account: ExternalTrackingAccountSecretRow): Promise<ExternalTrackingImportedMedia[]> {
		const token                                  = requireAccessToken(account);
		const viewerId                               = await this.getViewerId(token);
		const query                                  = `
			query NimlatCurrentUserAnimeList($page: Int!, $userId: Int!) {
				Page(page: $page, perPage: 50) {
					pageInfo { hasNextPage }
					mediaList(userId: $userId, type: ANIME) {
						mediaId
						status
						progress
						updatedAt
						media { id episodes idMal }
					}
				}
			}
		`;
		const items: ExternalTrackingImportedMedia[] = [];
		let page                                     = 1;
		let hasNextPage                              = true;

		while (hasNextPage) {
			const payload  = asRecord(await fetchJson(
				"https://graphql.anilist.co",
				{
					method:  "POST",
					headers: {
						Authorization:  `Bearer ${ token }`,
						"Content-Type": "application/json",
						Accept:         "application/json",
					},
					body:    JSON.stringify({
						query,
						variables: {
							page,
							userId: viewerId,
						},
					}),
				},
			));
			const data     = asRecord(payload.data);
			const pageData = asRecord(data.Page);
			items.push(...asArray(pageData.mediaList)
				.map(readAniListImportedMedia)
				.filter((item): item is ExternalTrackingImportedMedia => item !== null));

			hasNextPage = asRecord(pageData.pageInfo).hasNextPage === true;
			page += 1;
		}

		return items;
	}

	async pushWatchedBatch(account: ExternalTrackingAccountSecretRow, items: ExternalTrackingPushItem[]): Promise<void> {
		const token    = requireAccessToken(account);
		const mutation = `
			mutation NimlatSaveMediaListEntry($mediaId: Int!, $progress: Int!, $status: MediaListStatus) {
				SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
					id
				}
			}
		`;

		for (const item of items) {
			const idAniList = item.idAniList ?? Number(item.providerMediaId);
			if (!Number.isFinite(idAniList)) {
				continue;
			}
			await fetchJson(
				"https://graphql.anilist.co",
				{
					method:  "POST",
					headers: {
						Authorization:  `Bearer ${ token }`,
						"Content-Type": "application/json",
						Accept:         "application/json",
					},
					body:    JSON.stringify({
						query:     mutation,
						variables: {
							mediaId:  idAniList,
							// AniList cannot address episode identities. Export is deliberately
							// binary instead of fabricating a prefix from an aggregate count.
							progress: getAniListExportProgress(item),
							status:   item.isWatched ? "COMPLETED" : "PLANNING",
						},
					}),
				},
			);
		}
	}

	private async getViewerId(token: string): Promise<number> {
		const payload = asRecord(await fetchJson(
			"https://graphql.anilist.co",
			{
				method:  "POST",
				headers: {
					Authorization:  `Bearer ${ token }`,
					"Content-Type": "application/json",
					Accept:         "application/json",
				},
				body:    JSON.stringify({
					query: "query NimlatCurrentUser { Viewer { id } }",
				}),
			},
		));
		const id      = asNumber(asRecord(asRecord(payload.data).Viewer).id);
		if (!id) {
			throw new Error("AniList did not return the current user id.");
		}

		return id;
	}
}
