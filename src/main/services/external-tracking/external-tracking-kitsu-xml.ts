import type { ExternalTrackingImportedMedia } from "@nimlat/types/external-tracking";

const ANIME_BLOCK_PATTERN = /<anime\b[^>]*>([\s\S]*?)<\/anime>/giu;

function readXmlTag(block: string, tag: string): string | null {
	const match = new RegExp(
		`<${ tag }\\b[^>]*>([\\s\\S]*?)</${ tag }>`,
		"iu",
	).exec(block);
	return match?.[ 1 ]?.trim() || null;
}

function readNonNegativeInteger(value: string | null): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function readPositiveInteger(value: string | null): number | null {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readKitsuXmlDate(value: string | null): number | null {
	if (!value || value === "0000-00-00") return null;
	const parsed = Date.parse(`${ value }T00:00:00Z`);
	return Number.isFinite(parsed) ? parsed : null;
}

// Kitsu exports a MAL-compatible XML document: series_animedb_id is the MAL
// anime id. Keep providerMediaId null so it can never be mistaken for Kitsu's
// own anime id during a later explicit export.
export function parseKitsuAnimeXml(xml: string): ExternalTrackingImportedMedia[] {
	if (!/<myanimelist\b/iu.test(xml)) {
		throw new Error("The selected file is not a Kitsu/MAL-compatible anime XML export.");
	}

	const items: ExternalTrackingImportedMedia[] = [];
	for (const match of xml.matchAll(ANIME_BLOCK_PATTERN)) {
		const block = match[ 1 ] ?? "";
		const idMal = readPositiveInteger(readXmlTag(
			block,
			"series_animedb_id",
		));
		if (!idMal) continue;
		const status        = readXmlTag(
			block,
			"my_status",
		);
		const isWatched     = status?.toLowerCase() === "completed";
		const episodesCount = readPositiveInteger(readXmlTag(
			block,
			"series_episodes",
		));
		items.push({
			providerMediaId: null,
			idMal,
			isWatched,
			// The XML carries only a count. Preserve it only for a completed title;
			// partial counts cannot identify which episodes were watched.
			watchedEpisodeCount: isWatched
														 ? episodesCount ?? readNonNegativeInteger(readXmlTag(
				block,
				"my_watched_episodes",
			))
														 : 0,
			episodesCount,
			watchedAt:           readKitsuXmlDate(readXmlTag(
				block,
				"my_finish_date",
			)),
			rawStatus:           status,
		});
	}

	if (items.length === 0) {
		throw new Error("The selected XML does not contain any valid anime entries.");
	}
	return items;
}
