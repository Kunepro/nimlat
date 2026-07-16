import { isTrackedIntegrationStatus } from "@nimlat/constants/integration-status";
import { getReleaseDateSourceLabel } from "@nimlat/constants/release-date-source-labels";
import type {
	PastReleaseWatchRow,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchRow,
} from "@nimlat/types/release-watch";

export const RELEASE_WATCH_PAGE_LIMIT = 50;

export type ReleaseWatchTab = "past" | "upcoming";
export type ReleaseWatchRow = PastReleaseWatchRow | UpcomingReleaseWatchRow;

export const RELEASE_WATCH_TAB_ITEMS: Array<{ key: ReleaseWatchTab; label: string }> = [
	{
		key:   "upcoming",
		label: "Upcoming Releases",
	},
	{
		key:   "past",
		label: "Past Releases",
	},
];

export const SCOPE_FILTER_OPTIONS: Array<{ label: string; value: ReleaseWatchScopeFilter }> = [
	{
		label: "Tracked",
		value: "tracked",
	},
	{
		label: "All",
		value: "all",
	},
];

export const RELEASE_WATCH_TABLE_HEADERS = [
	"Media",
	"State",
	"Release",
	"Integration",
] as const;

export interface ReleaseWatchRowViewModel {
	integrationPercent: number;
	isFilm: boolean;
	mediaMeta: string;
	releaseDateText: string;
	releaseSourceLabel: string;
	shouldShowProgress: boolean;
	stateColor: string;
	stateLabel: string;
}

export function isReleaseWatchTab(value: string): value is ReleaseWatchTab {
	return value === "past" || value === "upcoming";
}

export function mergeReleaseWatchPageRows<TRow>(
	currentRows: TRow[],
	nextRows: TRow[],
	offset: number,
): TRow[] {
	return offset === 0 ? nextRows : [
		...currentRows,
		...nextRows,
	];
}

export function formatReleaseWatchActionError(
	error: unknown,
	fallbackMessage: string,
): string {
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallbackMessage;
}

export function formatReleaseDate(timestamp: number | null): string {
	if (timestamp == null) {
		return "Unknown date";
	}
	return new Date(timestamp).toLocaleString();
}

export function formatReleaseWatchState(state: ReleaseWatchRow["state"]): string {
	return state
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function getReleaseWatchStateColor(state: ReleaseWatchRow["state"]): string {
	if (state.includes("retry")) {
		return "orange";
	}
	return "blue";
}

export function formatReleaseWatchMediaType(format?: ReleaseWatchRow["format"]): string {
	switch (format) {
		case "MOVIE":
			return "Film";
		case "TV":
		case "TV_SHORT":
			return "Anime";
		case "OVA":
		case "ONA":
		case "SPECIAL":
		case "MUSIC":
			return format;
		default:
			return "Unknown type";
	}
}

export function getReleaseWatchRowKey(row: ReleaseWatchRow): string {
	return `${ row.watchDomain }:${ row.mediaId }`;
}

export function buildReleaseWatchRowViewModel(row: ReleaseWatchRow): ReleaseWatchRowViewModel {
	const shouldShowProgress = isTrackedIntegrationStatus(row.integrationStatus);

	return {
		integrationPercent: Math.round(row.integrationPercent ?? 0),
		isFilm:             row.format === "MOVIE",
		mediaMeta:          `${ formatReleaseWatchMediaType(row.format) } - ID ${ row.mediaId }`,
		releaseDateText:    formatReleaseDate(row.resolvedReleaseAt),
		releaseSourceLabel: getReleaseDateSourceLabel(row.releaseDateSource),
		shouldShowProgress,
		stateColor:         getReleaseWatchStateColor(row.state),
		stateLabel:         formatReleaseWatchState(row.state),
	};
}
