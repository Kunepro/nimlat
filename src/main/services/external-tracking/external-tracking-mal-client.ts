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
	parseIsoDate,
	requireAccessToken,
} from "./external-tracking-client-utils";
import type { ExternalTrackingProviderClient } from "./external-tracking-providers";

function readMalImportedMedia(entry: unknown): ExternalTrackingImportedMedia | null {
	const row        = asRecord(entry);
	const node       = asRecord(row.node);
	const listStatus = asRecord(row.list_status);
	const idMal      = asNumber(node.id);
	if (!idMal) {
		return null;
	}

	const reportedEpisodesCount = asNumber(node.num_episodes);
	// MAL uses zero when a total is unknown. Keep it absent so the import can
	// retain Nimlat's known episode total instead of replacing it with zero.
	const episodesCount = reportedEpisodesCount && reportedEpisodesCount > 0
		? Math.floor(reportedEpisodesCount)
		: undefined;
	const status        = asString(listStatus.status);
	const isWatched     = status === "completed";
	return {
		providerMediaId:     idMal.toString(),
		idMal,
		isWatched,
		// MAL provides only a count, not episode identities. Partial counts are
		// intentionally discarded rather than interpreted as episodes 1..N.
		watchedEpisodeCount: isWatched
													 ? episodesCount ?? asNumber(listStatus.num_episodes_watched) ?? 0
													 : 0,
		episodesCount,
		watchedAt:           parseIsoDate(listStatus.updated_at),
		rawStatus:           status,
	};
}

function getMalExportProgress(item: ExternalTrackingPushItem): number {
	if (!item.isWatched) return 0;
	return Math.max(
		0,
		Math.floor(item.episodesCount ?? item.watchedEpisodeCount),
	);
}

// MAL cannot address individual episodes, so Nimlat exports only states it can
// assert without inventing episode order: none is plan-to-watch, all is completed.
function getMalExportStatus(item: ExternalTrackingPushItem): "completed" | "plan_to_watch" {
	return item.isWatched ? "completed" : "plan_to_watch";
}

export class MyAnimeListTrackingClient implements ExternalTrackingProviderClient {
	provider: ExternalTrackingProvider = "mal";

	async importWatched(account: ExternalTrackingAccountSecretRow): Promise<ExternalTrackingImportedMedia[]> {
		const token                                  = requireAccessToken(account);
		const items: ExternalTrackingImportedMedia[] = [];
		let nextUrl: string | null                   = "https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status,num_episodes&limit=1000";

		while (nextUrl) {
			const payload = asRecord(await fetchJson(
				nextUrl,
				{
					headers: {
						Authorization: `Bearer ${ token }`,
					},
				},
			));
			items.push(...asArray(payload.data)
				.map(readMalImportedMedia)
				.filter((item): item is ExternalTrackingImportedMedia => item !== null));

			nextUrl = asString(asRecord(payload.paging).next);
		}

		return items;
	}

	async pushWatchedBatch(account: ExternalTrackingAccountSecretRow, items: ExternalTrackingPushItem[]): Promise<void> {
		const token = requireAccessToken(account);

		for (const item of items) {
			const malId = item.idMal ?? Number(item.providerMediaId);
			if (!Number.isFinite(malId)) {
				continue;
			}
			const progress = getMalExportProgress(item);
			const body     = new URLSearchParams();
			body.set(
				"num_watched_episodes",
				progress.toString(),
			);
			body.set(
				"status",
				getMalExportStatus(item),
			);

			await fetchJson(
				`https://api.myanimelist.net/v2/anime/${ malId }/my_list_status`,
				{
					method:  "PUT",
					headers: {
						Authorization:  `Bearer ${ token }`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body,
				},
			);
		}
	}
}
