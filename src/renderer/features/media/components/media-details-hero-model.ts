import type {
	MediaInspectionData,
	MediaNextAiringEpisodeSummary,
} from "@nimlat/types/ipc-payloads";

export type MediaDetailsInspection = MediaInspectionData;

interface MediaHeroFact {
	label: string;
	value: string;
	href?: string;
	ariaLabel?: string;
}

export interface MediaHeroDetailGroup {
	title: string;
	facts: MediaHeroFact[];
}

export interface MediaHeroIgnorePresentation {
	ariaLabel: string;
	isDisabled: boolean;
	isLoading: boolean;
	tooltipTitle: string;
}

type MediaHeroEpisodeListStatus =
	| "complete"
	| "unavailable"
	| "pending"
	| "processing"
	| "failed";

export function selectMediaHeroImageUrl(media: MediaDetailsInspection): string | undefined {
	return media.displayImageFullSizeUrl || media.displayImageUrl || media.imageUrl;
}

export function selectMediaHeroBannerImageUrl(media: MediaDetailsInspection): string | undefined {
	return media.displayBannerImageUrl || media.bannerImage;
}

export function resolveMediaHeroWatchedLabel(isWatched?: boolean): string {
	return isWatched === true
		? "Watched"
		: "Mark watched";
}

export function resolveMediaHeroIgnorePresentation(
	integrationStatus: MediaDetailsInspection["integrationStatus"],
	isUpdatingIntegrationStatus: boolean,
): MediaHeroIgnorePresentation {
	const isIgnored = integrationStatus === "ignored";
	const label     = isIgnored
		? "Media already ignored"
		: "Ignore media";

	return {
		ariaLabel:    label,
		isDisabled:   isIgnored || isUpdatingIntegrationStatus,
		isLoading:    isUpdatingIntegrationStatus && !isIgnored,
		tooltipTitle: label,
	};
}

function formatMediaHeroNumber(value?: number | null): string | undefined {
	return typeof value === "number" ? new Intl.NumberFormat().format(value) : undefined;
}

function formatMediaHeroScore(value?: number | null): string | undefined {
	return typeof value === "number" ? `${ value }%` : undefined;
}

function formatMediaHeroSeason(media: Pick<MediaDetailsInspection, "season" | "seasonYear">): string | undefined {
	if (!media.season && !media.seasonYear) {
		return undefined;
	}

	return [
		media.season,
		media.seasonYear,
	].filter(Boolean).join(" ");
}

function normalizeMediaHeroText(value?: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function normalizeMediaHeroTextKey(value: string): string {
	return value.trim().toLocaleLowerCase();
}

function buildMediaHeroTitleFacts(media: MediaDetailsInspection): MediaHeroFact[] {
	const seenTitles   = new Set<string>();
	const visibleTitle = normalizeMediaHeroText(media.name);
	if (visibleTitle) {
		seenTitles.add(normalizeMediaHeroTextKey(visibleTitle));
	}

	return [
		{
			label: "English",
			value: media.titleOptions?.english,
		},
		{
			label: "Romaji",
			value: media.titleOptions?.romaji,
		},
		{
			label: "Native",
			value: media.titleOptions?.native,
		},
	].flatMap((fact): MediaHeroFact[] => {
		const title = normalizeMediaHeroText(fact.value);
		if (!title) {
			return [];
		}

		const key = normalizeMediaHeroTextKey(title);
		if (seenTitles.has(key)) {
			return [];
		}

		seenTitles.add(key);
		return [
			{
				label: fact.label,
				value: title,
			},
		];
	});
}

function createMediaHeroProviderFact(
	label: string,
	id: number | null | undefined,
	urlPrefix: string,
): MediaHeroFact | undefined {
	if (typeof id !== "number" || !Number.isFinite(id)) {
		return undefined;
	}

	return {
		ariaLabel: `Open ${ label } page`,
		href:      `${ urlPrefix }${ id }`,
		label,
		value:     `#${ id }`,
	};
}

export function formatMediaHeroNextAiring(
	nextAiringEpisode?: MediaNextAiringEpisodeSummary,
): string | undefined {
	if (!nextAiringEpisode) {
		return undefined;
	}

	const date          = new Date(nextAiringEpisode.airingAt * 1000);
	const formattedDate = Number.isNaN(date.getTime())
		? undefined
		: new Intl.DateTimeFormat(
			undefined,
			{
				dateStyle: "medium",
				timeStyle: "short",
			},
		).format(date);

	return formattedDate
		? `Episode ${ nextAiringEpisode.episode } - ${ formattedDate }`
		: `Episode ${ nextAiringEpisode.episode }`;
}

export function formatMediaHeroEpisodesField(
	media: Pick<MediaDetailsInspection, "episodesCount" | "jikanEpisodesCoverageStatus">,
): string {
	if (media.episodesCount === 1) {
		return "Single episode";
	}

	// Jikan coverage only says whether provider episode metadata is loadable; it
	// must not override the canonical AniList episode count shown in Details.
	return media.episodesCount != null
		? media.episodesCount.toString()
		: "Episode list still loading";
}

function resolveMediaHeroEpisodeListStatus(
	media: Pick<MediaDetailsInspection, "episodeUpdatesQueueStatus" | "jikanEpisodesCoverageStatus">,
): MediaHeroEpisodeListStatus {
	if (
		media.episodeUpdatesQueueStatus === "pending"
		|| media.episodeUpdatesQueueStatus === "processing"
		|| media.episodeUpdatesQueueStatus === "failed"
	) {
		return media.episodeUpdatesQueueStatus;
	}

	if (media.jikanEpisodesCoverageStatus === "available") {
		return "complete";
	}

	if (media.jikanEpisodesCoverageStatus === "empty") {
		return "unavailable";
	}

	// No provider snapshot has been stored yet and no active/failed queue row is
	// visible in the inspection payload, so the list is still awaiting hydration.
	return "pending";
}

export function formatMediaHeroEpisodeListStatus(
	media: Pick<MediaDetailsInspection, "episodeUpdatesQueueStatus" | "jikanEpisodesCoverageStatus">,
): string {
	switch (resolveMediaHeroEpisodeListStatus(media)) {
		case "complete":
			return "Complete";
		case "unavailable":
			return "Unavailable";
		case "processing":
			return "Processing";
		case "failed":
			return "Failed";
		case "pending":
		default:
			return "Pending";
	}
}

function filterMediaHeroFacts(facts: Array<Omit<MediaHeroFact, "value"> & {
	value?: string | null
} | undefined>): MediaHeroFact[] {
	return facts.filter((fact): fact is MediaHeroFact => Boolean(fact?.value));
}

export function buildMediaHeroDetailGroups(media: MediaDetailsInspection): MediaHeroDetailGroup[] {
	return [
		{
			title: "Titles",
			facts: buildMediaHeroTitleFacts(media),
		},
		{
			title: "Links",
			facts: filterMediaHeroFacts([
				createMediaHeroProviderFact(
					"AniList",
					media.idAniList,
					"https://anilist.co/anime/",
				),
				createMediaHeroProviderFact(
					"MAL",
					media.idMal,
					"https://myanimelist.net/anime/",
				),
			]),
		},
		{
			title: "Media",
			facts: filterMediaHeroFacts([
				{
					label: "Format",
					value: media.format || "Unknown",
				},
				{
					label: "Status",
					value: media.status || "Unknown",
				},
				{
					label: "Episodes",
					value: formatMediaHeroEpisodesField(media),
				},
				{
					label: "Episode list",
					value: formatMediaHeroEpisodeListStatus(media),
				},
				...(media.isAdult
					? [
						{
							label: "Rating",
							value: "18+",
						},
					]
					: []),
			]),
		},
		{
			title: "Release",
			facts: filterMediaHeroFacts([
				{
					label: "Start",
					value: media.startDate,
				},
				{
					label: "End",
					value: media.endDate,
				},
				{
					label: "Season",
					value: formatMediaHeroSeason(media),
				},
				{
					label: "Next",
					value: formatMediaHeroNextAiring(media.nextAiringEpisode),
				},
			]),
		},
		{
			title: "Scores",
			facts: filterMediaHeroFacts([
				{
					label: "Average",
					value: formatMediaHeroScore(media.averageScore),
				},
				{
					label: "Mean",
					value: formatMediaHeroScore(media.meanScore),
				},
				{
					label: "Popularity",
					value: formatMediaHeroNumber(media.popularity),
				},
			]),
		},
		{
			title: "Origin",
			facts: filterMediaHeroFacts([
				{
					label: "Source",
					value: media.source,
				},
				{
					label: "Country",
					value: media.countryOfOrigin,
				},
			]),
		},
	].filter(group => group.facts.length > 0);
}
