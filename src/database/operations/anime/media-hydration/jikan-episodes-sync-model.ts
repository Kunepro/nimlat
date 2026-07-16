import {
	createSearchKey,
	normalizeJikanEpisodeVideoThumbnailUrl,
	resolveJikanEpisodeVideoEpisodeNumber,
} from "@nimlat/functions";
import type {
	JikanEpisodesCoverageStatus,
	JikanEpisodesSyncStateDto,
} from "@nimlat/types/anime-db";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "@nimlat/types/jikan-api";

export type JikanEpisodesSyncStateRow = {
	mediaId: number;
	syncRunId: string;
	phase: "episodes" | "synopses" | "finalize";
	lastEpisodesPage: number;
	hasNextEpisodesPage: number;
	// Legacy DB column names: these now track per-episode synopsis detail progress.
	lastVideosPage: number;
	hasNextVideosPage: number;
	startedAt: number;
	updatedAt: number;
};

export type EpisodeStagingWriteRow = {
	mediaId: number;
	syncRunId: string;
	episodeNumber: number;
	url: string | null;
	name: string | null;
	nameJapanese: string | null;
	nameRomanji: string | null;
	synopsis: string | null;
	duration: number | null;
	aired: string | null;
	score: number | null;
	filler: number;
	recap: number;
	thumbnail: string | null;
};

export type JikanEpisodeSynopsisCandidate = {
	episodeNumber: number;
};

export type JikanEpisodeThumbnailWrite = {
	episodeNumber: number;
	thumbnail: string | null;
	title: string | null;
};

export type JikanEpisodeThumbnailTitleMatchRow = {
	episodeNumber: number;
	name: string | null;
	nameJapanese: string | null;
	nameRomanji: string | null;
};

export function createJikanEpisodesSyncRunId(mediaId: number, now: number): string {
	return `${ now }-${ mediaId }`;
}

export function toJikanEpisodesSyncStateDto(row: JikanEpisodesSyncStateRow): JikanEpisodesSyncStateDto {
	return {
		mediaId:                   row.mediaId,
		syncRunId:                 row.syncRunId,
		phase:                     row.phase,
		lastEpisodesPage:          row.lastEpisodesPage,
		hasNextEpisodesPage:       Boolean(row.hasNextEpisodesPage),
		lastSynopsisEpisodeNumber: row.lastVideosPage,
		hasNextSynopsisEpisode:    Boolean(row.hasNextVideosPage),
		startedAt:                 row.startedAt,
		updatedAt:                 row.updatedAt,
	};
}

export function createInitialJikanEpisodesSyncStateRow(
	mediaId: number,
	syncRunId: string,
	now: number,
): JikanEpisodesSyncStateRow {
	return {
		mediaId,
		syncRunId,
		phase:               "episodes",
		lastEpisodesPage:    0,
		hasNextEpisodesPage: 1,
		lastVideosPage:      0,
		hasNextVideosPage:   1,
		startedAt:           now,
		updatedAt:           now,
	};
}

export function toEpisodesProgressStateRow(
	state: JikanEpisodesSyncStateRow,
	lastEpisodesPage: number,
	hasNextEpisodesPage: boolean,
	now: number,
): JikanEpisodesSyncStateRow {
	return {
		...state,
		phase:               hasNextEpisodesPage ? "episodes" : "synopses",
		lastEpisodesPage,
		hasNextEpisodesPage: hasNextEpisodesPage ? 1 : 0,
		updatedAt:           now,
	};
}

export function toSynopsisProgressStateRow(
	state: JikanEpisodesSyncStateRow,
	lastSynopsisEpisodeNumber: number,
	hasNextSynopsisEpisode: boolean,
	now: number,
): JikanEpisodesSyncStateRow {
	return {
		...state,
		phase:             hasNextSynopsisEpisode ? "synopses" : "finalize",
		lastVideosPage:    lastSynopsisEpisodeNumber,
		hasNextVideosPage: hasNextSynopsisEpisode ? 1 : 0,
		updatedAt:         now,
	};
}

export function toJikanEpisodeStagingWriteRows(
	mediaId: number,
	syncRunId: string,
	episodes: JikanEpisode[],
): EpisodeStagingWriteRow[] {
	return episodes.map(episode => ({
		mediaId,
		syncRunId,
		episodeNumber: episode.mal_id,
		url:           episode.url ?? null,
		name:          episode.title || null,
		nameJapanese:  episode.title_japanese ?? null,
		nameRomanji:   episode.title_romanji ?? null,
		synopsis:      episode.synopsis ?? null,
		duration:      episode.duration ?? null,
		aired:         episode.aired ?? null,
		score:         episode.score ?? null,
		filler:        episode.filler ? 1 : 0,
		recap:         episode.recap ? 1 : 0,
		// Jikan /episodes payload does not include thumbnails; a later provider pass
		// enriches them through video endpoints when the episode identity is safe.
		thumbnail: null,
	}));
}

export function toJikanEpisodeThumbnailWrites(videos: JikanEpisodeVideo[]): JikanEpisodeThumbnailWrite[] {
	return videos.flatMap((video) => {
		const thumbnail = normalizeJikanEpisodeVideoThumbnailUrl(video.images?.jpg?.image_url);
		if (thumbnail === undefined) {
			return [];
		}

		const episodeNumber = resolveJikanEpisodeVideoEpisodeNumber(video);
		if (episodeNumber === undefined) {
			return [];
		}

		return [
			{
				episodeNumber,
				thumbnail,
				title: video.title ?? null,
			},
		];
	});
}

function createComparableEpisodeTitleKeys(value?: string | null): string[] {
	const rawKey = createSearchKey(value);
	if (!rawKey) {
		return [];
	}

	const withoutEpisodePrefixKey = createSearchKey(value?.replace(
		/^\s*(?:episode|ep\.?)\s*#?\s*\d{1,5}\s*(?:[:.)-]\s*)?/i,
		"",
	));
	if (!withoutEpisodePrefixKey || withoutEpisodePrefixKey === rawKey) {
		return [ rawKey ];
	}

	return [
		rawKey,
		withoutEpisodePrefixKey,
	];
}

export function isJikanEpisodeThumbnailWriteCompatibleWithEpisode(
	write: JikanEpisodeThumbnailWrite,
	episode: JikanEpisodeThumbnailTitleMatchRow | null,
): boolean {
	if (!episode) {
		return false;
	}

	const episodeTitleKeys = [
		...createComparableEpisodeTitleKeys(episode.name),
		...createComparableEpisodeTitleKeys(episode.nameRomanji),
		...createComparableEpisodeTitleKeys(episode.nameJapanese),
	];
	if (episodeTitleKeys.length === 0) {
		return true;
	}

	const videoTitleKeys = createComparableEpisodeTitleKeys(write.title);
	if (videoTitleKeys.length === 0) {
		return false;
	}

	// MAL/Jikan episode-video pages can expose streaming-provider season numbers
	// as episode numbers. Title agreement is the guardrail that keeps those rows
	// from overwriting old canonical episodes with later-arc thumbnails.
	return videoTitleKeys.some(videoTitleKey => episodeTitleKeys.includes(videoTitleKey));
}

export function toJikanEpisodesCoverageStatus(stagedEpisodeCount: number): JikanEpisodesCoverageStatus {
	return stagedEpisodeCount > 0
		? "available"
		: "empty";
}
