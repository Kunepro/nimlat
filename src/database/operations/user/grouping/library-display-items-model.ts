import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import {
	createLibraryItemKey,
	createSearchKey,
} from "@nimlat/functions";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayItem,
	LibraryDisplayMode,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "../../anime/resolve-media-image-url";

export type LibraryDisplayItemRow = {
	itemKind: "group" | "media";
	itemSource: "official" | "user" | null;
	groupId: number | null;
	mediaId: number | null;
	name: string;
	description: string | null;
	imageUrl: string | null;
	format: string | null;
	isAdult: number;
	coverImageJson: string | null;
	bannerImage: string | null;
	isWatched: number;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
	mediasCount: number | null;
	lastRefreshAt: number | null;
};

export interface LibraryDisplayQueryInput {
	genreNamesJson: string;
	likePattern: string;
	normalizedFilters: LibraryDisplayFilters;
	normalizedSearch: string;
	tagNamesJson: string;
}

export type LibraryDisplayQueryArgs = [
	scope: LibraryDisplayScope,
	adultFilter: LibraryAdultFilter,
	displayMode: LibraryDisplayMode,
	genreNamesJson: string,
	tagNamesJson: string,
	officialSearch: string,
	officialLikePattern: string,
	userSearch: string,
	userLikePattern: string,
	mediaSearch: string,
	mediaLikePattern: string,
];

const DEFAULT_LIBRARY_FILTERS: Required<LibraryDisplayFilters> = {
	adultFilter: "mixed",
	displayMode: "groups",
	genreNames:  [],
	tagNames:    [],
};

const LIBRARY_ADULT_FILTERS = new Set<LibraryAdultFilter>([
	"mixed",
	"adult",
	"nonAdult",
]);

const LIBRARY_DISPLAY_MODES = new Set<LibraryDisplayMode>([
	"groups",
	"rawMedia",
]);

export function normalizeFilterNames(values: unknown): string[] {
	if (!Array.isArray(values)) {
		return [];
	}

	const seen            = new Set<string>();
	const names: string[] = [];
	for (const value of values) {
		if (typeof value !== "string") {
			continue;
		}
		const name = value.trim();
		const key  = name.toLocaleLowerCase();
		if (!name || seen.has(key)) {
			continue;
		}
		seen.add(key);
		names.push(name);
	}

	return names;
}

export function normalizeLibraryFilters(filters: Partial<LibraryDisplayFilters> = {}): LibraryDisplayFilters {
	return {
		adultFilter: LIBRARY_ADULT_FILTERS.has(filters.adultFilter ?? "mixed")
									 ? filters.adultFilter ?? DEFAULT_LIBRARY_FILTERS.adultFilter
									 : DEFAULT_LIBRARY_FILTERS.adultFilter,
		displayMode: LIBRARY_DISPLAY_MODES.has(filters.displayMode ?? "groups")
									 ? filters.displayMode ?? DEFAULT_LIBRARY_FILTERS.displayMode
									 : DEFAULT_LIBRARY_FILTERS.displayMode,
		genreNames:  normalizeFilterNames(filters.genreNames),
		tagNames:    normalizeFilterNames(filters.tagNames),
	};
}

export function createLibraryDisplayQueryInput(
	search: string,
	filters: Partial<LibraryDisplayFilters>,
): LibraryDisplayQueryInput {
	const normalizedSearch  = createSearchKey(search);
	const normalizedFilters = normalizeLibraryFilters(filters);

	return {
		normalizedSearch,
		likePattern:    `%${ normalizedSearch }%`,
		normalizedFilters,
		genreNamesJson: JSON.stringify(normalizedFilters.genreNames),
		tagNamesJson:   JSON.stringify(normalizedFilters.tagNames),
	};
}

export function createLibraryDisplayQueryArgs(
	scope: LibraryDisplayScope,
	input: LibraryDisplayQueryInput,
): LibraryDisplayQueryArgs {
	return [
		scope,
		input.normalizedFilters.adultFilter ?? DEFAULT_LIBRARY_FILTERS.adultFilter,
		input.normalizedFilters.displayMode ?? DEFAULT_LIBRARY_FILTERS.displayMode,
		input.genreNamesJson,
		input.tagNamesJson,
		input.normalizedSearch,
		input.likePattern,
		input.normalizedSearch,
		input.likePattern,
		input.normalizedSearch,
		input.likePattern,
	];
}

export function resolveMediaImageUrl(
	imageUrl: string | null,
	coverImageJson: string | null,
	bannerImage: string | null,
): string | undefined {
	return resolveAnimeMediaImageUrl(
		imageUrl,
		coverImageJson,
		bannerImage,
	);
}

function toLastRefreshIso(lastRefreshAt: number | null): string {
	return lastRefreshAt
		? new Date(lastRefreshAt).toISOString()
		: new Date(0).toISOString();
}

function mapGroupRow(row: LibraryDisplayItemRow): LibraryDisplayItem {
	if (!row.itemSource || typeof row.groupId !== "number") {
		throw new Error("Library query returned a group row without group identity.");
	}

	return {
		key:                createLibraryItemKey({
			kind:  "group",
			group: {
				source:  row.itemSource,
				groupId: row.groupId,
			},
		}),
		kind:               row.itemKind,
		name:               row.name,
		description:        row.description ?? undefined,
		imageUrl:           row.imageUrl ?? undefined,
		format:             row.format ?? undefined,
		isAdult:            row.isAdult === 1,
		isWatched:          row.isWatched === 1,
		integrationPercent: row.integrationPercent ?? undefined,
		integrationStatus:  normalizeIntegrationStatus(row.integrationStatus) ?? undefined,
		lastRefresh:        toLastRefreshIso(row.lastRefreshAt),
		group:              {
			source:  row.itemSource,
			groupId: row.groupId,
		},
		mediasCount:        row.mediasCount ?? 0,
	};
}

function mapMediaRow(row: LibraryDisplayItemRow): LibraryDisplayItem {
	if (typeof row.mediaId !== "number") {
		throw new Error("Library query returned a media row without mediaId.");
	}

	return {
		key:                createLibraryItemKey({
			kind:    "media",
			mediaId: row.mediaId,
		}),
		kind:               row.itemKind,
		name:               row.name,
		description:        row.description ?? undefined,
		imageUrl:           resolveMediaImageUrl(
			row.imageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		format:             row.format ?? undefined,
		isAdult:            row.isAdult === 1,
		isFilm:             row.format === "MOVIE",
		isWatched:          row.isWatched === 1,
		integrationPercent: row.integrationPercent ?? undefined,
		integrationStatus:  normalizeIntegrationStatus(row.integrationStatus) ?? undefined,
		lastRefresh:        toLastRefreshIso(row.lastRefreshAt),
		mediaId:            row.mediaId,
	};
}

export function mapLibraryDisplayRows(rows: LibraryDisplayItemRow[]): LibraryDisplayItem[] {
	return rows.map((row) => row.itemKind === "group"
		? mapGroupRow(row)
		: mapMediaRow(row));
}
