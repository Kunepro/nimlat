import type {
	JikanEpisodeDetailsResponse,
	JikanEpisodeVideosResponse,
	JikanResponse,
} from "@nimlat/types/jikan-api";
import {
	JikanMalformedPayloadError,
	type JikanResponseContext,
} from "./jikan-errors";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizePagination(payload: unknown, page: number): JikanResponse["pagination"] {
	if (!isRecord(payload) || !isRecord(payload.pagination)) {
		return {
			last_visible_page: page,
			has_next_page:     false,
		};
	}

	const {
					last_visible_page: lastVisiblePage,
					has_next_page:     hasNextPage,
				} = payload.pagination;

	return {
		last_visible_page: typeof lastVisiblePage === "number" ? lastVisiblePage : page,
		has_next_page:     typeof hasNextPage === "boolean" ? hasNextPage : false,
	};
}

function normalizeJikanResponseData<T>(
	payload: unknown,
	context: JikanResponseContext,
): T[] {
	if (isRecord(payload) && Array.isArray(payload.data)) {
		return payload.data as T[];
	}

	// Treat malformed success payloads as diagnostics-worthy provider failures.
	// The daemon decides whether the endpoint is canonical episode data or
	// non-blocking thumbnail enrichment.
	throw new JikanMalformedPayloadError(
		context,
		"response did not include a data array",
	);
}

export function toJikanEpisodesResponse(payload: unknown, context: JikanResponseContext): JikanResponse {
	return {
		pagination: normalizePagination(
			payload,
			context.page,
		),
		data:       normalizeJikanResponseData(
			payload,
			context,
		),
	};
}

export function toJikanEpisodeVideosResponse(payload: unknown, context: JikanResponseContext): JikanEpisodeVideosResponse {
	return {
		pagination: normalizePagination(
			payload,
			context.page,
		),
		data:       normalizeJikanResponseData(
			payload,
			context,
		),
	};
}

export function toJikanEpisodeDetailsResponse(payload: unknown, context: JikanResponseContext): JikanEpisodeDetailsResponse {
	if (isRecord(payload) && isRecord(payload.data)) {
		return {
			data: payload.data as unknown as JikanEpisodeDetailsResponse["data"],
		};
	}

	throw new JikanMalformedPayloadError(
		context,
		"response did not include an episode data object",
	);
}
