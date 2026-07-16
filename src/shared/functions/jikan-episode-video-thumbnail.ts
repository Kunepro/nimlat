const MAL_BANNED_YOUTUBE_ICON_PATTERN = /\/images\/icon-banned-youtube\.png(?:$|[?#])/i;
const EPISODE_LABEL_NUMBER_PATTERN = /\b(?:episode|ep\.?)\s*#?\s*(\d{1,5})\b/i;
const LEADING_EPISODE_NUMBER_PATTERN = /^\s*#?\s*(\d{1,5})(?:\s*(?:[:.)-]|$))/;
const MAL_EPISODE_URL_NUMBER_PATTERN = /\/episode\/(\d{1,5})(?:[/?#]|$)/i;

type JikanEpisodeVideoEpisodeNumberSource = {
	mal_id?: number | null;
	title?: string | null;
	episode?: string | null;
	url?: string | null;
};

export function isMalBannedYoutubeThumbnailUrl(value?: string | null): boolean {
	return typeof value === "string" && MAL_BANNED_YOUTUBE_ICON_PATTERN.test(value);
}

export function normalizeJikanEpisodeVideoThumbnailUrl(value?: string | null): string | null | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}

	// MAL exposes this region/provider placeholder through Jikan as a thumbnail
	// URL, but it is not useful episode artwork. Treat it as an explicit clear
	// so the UI falls back to Nimlat's default episode thumbnail.
	if (isMalBannedYoutubeThumbnailUrl(trimmed)) {
		return null;
	}

	return trimmed;
}

function parsePositiveEpisodeNumber(value?: string | null): number | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}

	const match = EPISODE_LABEL_NUMBER_PATTERN.exec(trimmed)
		?? LEADING_EPISODE_NUMBER_PATTERN.exec(trimmed)
		?? MAL_EPISODE_URL_NUMBER_PATTERN.exec(trimmed);
	if (!match) {
		return undefined;
	}

	const episodeNumber = Number.parseInt(
		match[ 1 ],
		10,
	);
	return Number.isSafeInteger(episodeNumber) && episodeNumber > 0
		? episodeNumber
		: undefined;
}

export function resolveJikanEpisodeVideoEpisodeNumber(video: JikanEpisodeVideoEpisodeNumberSource): number | undefined {
	const episodeNumber = parsePositiveEpisodeNumber(video.episode)
		?? parsePositiveEpisodeNumber(video.url);
	if (episodeNumber !== undefined) {
		return episodeNumber;
	}

	// Jikan documents episode-video mal_id as "MyAnimeList ID or Episode Number".
	// Treating it as an episode number corrupts long-running series when MAL returns
	// a video id there, so ambiguous rows are intentionally skipped.
	return undefined;
}
