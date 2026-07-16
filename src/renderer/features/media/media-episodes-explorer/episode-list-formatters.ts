type EpisodeMetadataKind = "aired" | "duration" | "score";

export interface EpisodeMetadataItem {
	kind: EpisodeMetadataKind;
	tooltip: string;
	value?: string;
	isKnown: boolean;
}

function formatEpisodeAired(value?: string | null): EpisodeMetadataItem {
	if (!value) {
		return {
			kind:    "aired",
			tooltip: "Air date unknown",
			value:   "-",
			isKnown: false,
		};
	}

	const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	const date          = dateOnlyMatch
		? new Date(
			Number(dateOnlyMatch[ 1 ]),
			Number(dateOnlyMatch[ 2 ]) - 1,
			Number(dateOnlyMatch[ 3 ]),
		)
		: new Date(value);

	if (Number.isNaN(date.getTime())) {
		return {
			kind:    "aired",
			tooltip: `Aired: ${ value }`,
			value,
			isKnown: true,
		};
	}

	const formattedDate = new Intl.DateTimeFormat(
		undefined,
		{ dateStyle: "medium" },
	).format(date);

	return {
		kind:    "aired",
		tooltip: `Air date: ${ formattedDate }`,
		value:   formattedDate,
		isKnown: true,
	};
}

function formatEpisodeDuration(durationSeconds?: number | null): EpisodeMetadataItem {
	if (typeof durationSeconds !== "number" || durationSeconds <= 0) {
		return {
			kind:    "duration",
			tooltip: "Duration unknown",
			value:   "-",
			isKnown: false,
		};
	}

	const totalMinutes = Math.floor(durationSeconds / 60);
	const seconds      = durationSeconds % 60;
	const value = seconds === 0
		? `${ totalMinutes }m`
		: `${ totalMinutes }m ${ seconds }s`;

	return {
		kind:    "duration",
		tooltip: `Duration: ${ value }`,
		value,
		isKnown: true,
	};
}

function formatEpisodeScore(score?: number | null): EpisodeMetadataItem {
	if (typeof score !== "number") {
		return {
			kind:    "score",
			tooltip: "Score unknown",
			value:   "-",
			isKnown: false,
		};
	}

	const value = score.toFixed(2).replace(
		/\.?0+$/,
		"",
	);

	return {
		kind:    "score",
		tooltip: `Score: ${ value }`,
		value,
		isKnown: true,
	};
}

export function createEpisodeMetadataItems(episode: {
	aired?: string | null;
	duration?: number | null;
	score?: number | null;
}): EpisodeMetadataItem[] {
	return [
		formatEpisodeAired(episode.aired),
		formatEpisodeDuration(episode.duration),
		formatEpisodeScore(episode.score),
	];
}

export function formatEpisodeRecap(recap?: string): string {
	const normalizedRecap = recap?.trim();
	return normalizedRecap || "No episode recap available yet.";
}
