import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import { normalizeJikanEpisodeVideoThumbnailUrl } from "@nimlat/functions";
import type {
	IntegrationStatus,
	JikanEpisodesCoverageStatus,
} from "@nimlat/types/anime-db";
import type {
	EpisodePlaybackIssueMoment,
	MediaEpisodeInspectionRow,
	MediaInspectionData,
	MediaNextAiringEpisodeSummary,
	MediaTagSummary,
} from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";

export type MediaInspectionMediaRow = {
	averageScore: number | null;
	bannerImage: string | null;
	countryOfOrigin: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	description: string | null;
	endDateDay: number | null;
	endDateMonth: number | null;
	endDateYear: number | null;
	episodeUpdatesQueueStatus: string | null;
	episodesCount: number | null;
	format: string | null;
	hasAudioIssue: number;
	hasDubIssue: number;
	hasEncodingIssue: number;
	hasHydrationIssue: number;
	hasSubIssue: number;
	hasVideoIssue: number;
	idAniList: number | null;
	idMal: number | null;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
	isAdult: number | null;
	isWatched: number;
	jikanEpisodesCoverageStatus: JikanEpisodesCoverageStatus | null;
	meanScore: number | null;
	mediaId: number;
	name: string | null;
	nameEnglish: string | null;
	nameJapanese: string | null;
	nameRomanji: string | null;
	nextAiringEpisodeJson: string | null;
	playbackIssueNote: string | null;
	popularity: number | null;
	season: string | null;
	seasonYear: number | null;
	source: string | null;
	startDateDay: number | null;
	startDateMonth: number | null;
	startDateYear: number | null;
	status: string | null;
};

export type MediaInspectionEpisodeRow = {
	aired: string | null;
	description: string | null;
	duration: number | null;
	episodeNumber: number;
	filler: number | null;
	hasAudioIssue: number;
	hasDubIssue: number;
	hasEncodingIssue: number;
	hasSubIssue: number;
	hasVideoIssue: number;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
	isWatched: number;
	mediaId: number;
	name: string | null;
	playbackIssueNote: string | null;
	score: number | null;
	synopsis: string | null;
	thumbnail: string | null;
};

export type MediaInspectionEpisodePlaybackIssueMomentRow = {
	episodeNumber: number;
	note: string | null;
	playbackIssueCategory: EpisodePlaybackIssueMoment["playbackIssueCategory"];
	timeSeconds: number;
};

export type MediaInspectionMediaPlaybackIssueMomentRow = {
	note: string | null;
	playbackIssueCategory: EpisodePlaybackIssueMoment["playbackIssueCategory"];
	timeSeconds: number;
};

export type MediaInspectionGenreRow = {
	name: string;
};

export type MediaInspectionTagRow = {
	category: string | null;
	name: string | null;
	rank: number | null;
};

export type MediaInspectionEpisodeCountRow = {
	hydratedEpisodesCount: number;
};

export type MediaInspectionModelRows = {
	episodeRows: MediaInspectionEpisodeRow[];
	genreRows: MediaInspectionGenreRow[];
	hydratedEpisodesCount: number;
	media: MediaInspectionMediaRow;
	mediaPlaybackIssueMomentRows: MediaInspectionMediaPlaybackIssueMomentRow[];
	playbackIssueMomentRows: MediaInspectionEpisodePlaybackIssueMomentRow[];
	tagRows: MediaInspectionTagRow[];
};

type NextAiringEpisodePayload = {
	airingAt?: unknown;
	episode?: unknown;
	timeUntilAiring?: unknown;
};

export function resolveMediaInspectionImageUrl(
	customImageUrl: string | null,
	coverImageJson: string | null,
	bannerImage: string | null,
): string | undefined {
	return resolveAnimeMediaImageUrl(
		customImageUrl,
		coverImageJson,
		bannerImage,
	);
}

export function normalizeEpisodeUpdatesQueueStatus(status: string | null): MediaInspectionData["episodeUpdatesQueueStatus"] {
	if (status === "pending" || status === "processing" || status === "failed") {
		return status;
	}

	return undefined;
}

export function formatMediaInspectionDateParts(year: number | null, month: number | null, day: number | null): string | undefined {
	if (!year) {
		return undefined;
	}
	if (!month) {
		return year.toString();
	}
	if (!day) {
		return `${ year }-${ month.toString().padStart(
			2,
			"0",
		) }`;
	}

	return `${ year }-${ month.toString().padStart(
		2,
		"0",
	) }-${ day.toString().padStart(
		2,
		"0",
	) }`;
}

export function parseNextAiringEpisode(value: string | null): MediaNextAiringEpisodeSummary | undefined {
	if (!value) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(value) as NextAiringEpisodePayload;
		if (typeof parsed.episode !== "number" || typeof parsed.airingAt !== "number") {
			return undefined;
		}

		return {
			airingAt:        parsed.airingAt,
			episode:         parsed.episode,
			timeUntilAiring: typeof parsed.timeUntilAiring === "number" ? parsed.timeUntilAiring : undefined,
		};
	} catch {
		return undefined;
	}
}

export function resolveSupportsMediaPlaybackIssueMoments(
	format: string | null,
	jikanEpisodesCoverageStatus?: JikanEpisodesCoverageStatus | null,
): boolean {
	// Movies have no child episode rows, and Jikan-empty media currently lack
	// usable child rows even when AniList still gives a canonical episode count.
	// In both cases timed playback issue markers need a media-level fallback.
	return format === "MOVIE" || jikanEpisodesCoverageStatus === "empty";
}

export function resolveMediaInspectionEpisodesCount(
	catalogEpisodesCount: number | null,
	hydratedEpisodesCount: number,
): number | undefined {
	// AniList can leave episodesCount unknown for long-running series; once Jikan
	// has finalized rows, the inspection payload should expose the usable count.
	// Jikan empty coverage is intentionally not converted to 0: it means there
	// is no loadable provider episode metadata, not that the media has no content.
	if (typeof catalogEpisodesCount === "number") {
		return Math.max(
			catalogEpisodesCount,
			hydratedEpisodesCount,
		);
	}

	return hydratedEpisodesCount > 0 ? hydratedEpisodesCount : undefined;
}

function mapPlaybackIssueMoment(row: MediaInspectionMediaPlaybackIssueMomentRow): EpisodePlaybackIssueMoment {
	return {
		note:                  row.note || undefined,
		playbackIssueCategory: row.playbackIssueCategory,
		timeSeconds:           row.timeSeconds,
	};
}

function mapTagRows(tagRows: MediaInspectionTagRow[]): MediaTagSummary[] {
	return tagRows.flatMap((row): MediaTagSummary[] => row.name
		? [
			{
				category: row.category || undefined,
				name:     row.name,
				rank:     row.rank ?? undefined,
			},
		]
		: []);
}

function groupEpisodePlaybackIssueMoments(
	playbackIssueMomentRows: MediaInspectionEpisodePlaybackIssueMomentRow[],
): Map<number, EpisodePlaybackIssueMoment[]> {
	return playbackIssueMomentRows.reduce<Map<number, EpisodePlaybackIssueMoment[]>>(
		(acc, row) => {
			const current = acc.get(row.episodeNumber) || [];
			current.push({
				note:                  row.note || undefined,
				playbackIssueCategory: row.playbackIssueCategory,
				timeSeconds:           row.timeSeconds,
			});
			acc.set(
				row.episodeNumber,
				current,
			);
			return acc;
		},
		new Map<number, EpisodePlaybackIssueMoment[]>(),
	);
}

function mapEpisodeRows(
	episodeRows: MediaInspectionEpisodeRow[],
	playbackIssueMomentRows: MediaInspectionEpisodePlaybackIssueMomentRow[],
): MediaEpisodeInspectionRow[] {
	const playbackIssueMomentsByEpisode = groupEpisodePlaybackIssueMoments(playbackIssueMomentRows);

	return episodeRows.map((episode): MediaEpisodeInspectionRow => ({
		aired:                episode.aired || undefined,
		description:          episode.description ?? undefined,
		duration:             episode.duration ?? undefined,
		episodeNumber:        episode.episodeNumber,
		filler:               episode.filler === 1,
		hasAudioIssue:        episode.hasAudioIssue === 1,
		hasDubIssue:          episode.hasDubIssue === 1,
		hasEncodingIssue:     episode.hasEncodingIssue === 1,
		hasSubIssue:          episode.hasSubIssue === 1,
		hasVideoIssue:        episode.hasVideoIssue === 1,
		integrationPercent:   episode.integrationPercent ?? undefined,
		integrationStatus:    normalizeIntegrationStatus(episode.integrationStatus) ?? undefined,
		isWatched:            episode.isWatched === 1,
		mediaId:              episode.mediaId,
		name:                 episode.name || undefined,
		playbackIssueMoments: playbackIssueMomentsByEpisode.get(episode.episodeNumber),
		playbackIssueNote:    episode.playbackIssueNote || undefined,
		recap:                episode.synopsis || undefined,
		score:                episode.score ?? undefined,
		thumbnail:            normalizeJikanEpisodeVideoThumbnailUrl(episode.thumbnail) ?? undefined,
	}));
}

export function createMediaInspectionData({
																						episodeRows,
																						genreRows,
																						hydratedEpisodesCount,
																						media,
																						mediaPlaybackIssueMomentRows,
																						playbackIssueMomentRows,
																						tagRows,
																					}: MediaInspectionModelRows): MediaInspectionData {
	const episodes = mapEpisodeRows(
		episodeRows,
		playbackIssueMomentRows,
	);

	return {
		averageScore:                      media.averageScore ?? undefined,
		bannerImage:                       media.bannerImage || undefined,
		countryOfOrigin:                   media.countryOfOrigin || undefined,
		description:                       media.description || undefined,
		endDate:                           formatMediaInspectionDateParts(
			media.endDateYear,
			media.endDateMonth,
			media.endDateDay,
		),
		episodeUpdatesQueueStatus:         normalizeEpisodeUpdatesQueueStatus(media.episodeUpdatesQueueStatus),
		episodes,
		episodesCount:                     resolveMediaInspectionEpisodesCount(
			media.episodesCount,
			hydratedEpisodesCount,
		),
		format:                            media.format || undefined,
		genres:                            genreRows
																				 .map(row => row.name)
																				 .filter(Boolean),
		hasAudioIssue:                     media.hasAudioIssue === 1,
		hasDubIssue:                       media.hasDubIssue === 1,
		hasEncodingIssue:                  media.hasEncodingIssue === 1,
		hasHydrationIssue:                 media.hasHydrationIssue === 1,
		hasSubIssue:                       media.hasSubIssue === 1,
		hasVideoIssue:                     media.hasVideoIssue === 1,
		idAniList:                         media.idAniList ?? undefined,
		idMal:                             media.idMal ?? undefined,
		imageUrl:                          resolveMediaInspectionImageUrl(
			media.customImageUrl,
			media.coverImageJson,
			media.bannerImage,
		),
		integrationPercent:                media.integrationPercent ?? undefined,
		integrationStatus:                 normalizeIntegrationStatus(media.integrationStatus) ?? undefined,
		isAdult:                           media.isAdult === 1,
		isFilm:                            media.format === "MOVIE",
		isWatched:                         media.isWatched === 1,
		jikanEpisodesCoverageStatus:       media.jikanEpisodesCoverageStatus ?? undefined,
		meanScore:                         media.meanScore ?? undefined,
		mediaId:                           media.mediaId,
		name:                              media.name || `Media ${ media.mediaId }`,
		nextAiringEpisode:                 parseNextAiringEpisode(media.nextAiringEpisodeJson),
		playbackIssueMoments:              mediaPlaybackIssueMomentRows.map(mapPlaybackIssueMoment),
		playbackIssueNote:                 media.playbackIssueNote || undefined,
		popularity:                        media.popularity ?? undefined,
		season:                            media.season || undefined,
		seasonYear:                        media.seasonYear ?? undefined,
		source:                            media.source || undefined,
		startDate:                         formatMediaInspectionDateParts(
			media.startDateYear,
			media.startDateMonth,
			media.startDateDay,
		),
		status:                            media.status || undefined,
		supportsMediaPlaybackIssueMoments: resolveSupportsMediaPlaybackIssueMoments(
			media.format,
			media.jikanEpisodesCoverageStatus,
		),
		tags:                              mapTagRows(tagRows),
		titleOptions:                      {
			english: media.nameEnglish || undefined,
			native:  media.nameJapanese || undefined,
			romaji:  media.nameRomanji || undefined,
		},
	};
}
