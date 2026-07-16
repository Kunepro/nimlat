import {
	logJikanEpisodesPage,
	logJikanEpisodeVideosPage,
} from "@nimlat/loggers/main";
import {
	JikanEpisodeDetailsResponse,
	JikanEpisodeVideosResponse,
	JikanResponse,
} from "@nimlat/types/jikan-api";
import PQueue from "p-queue";
import { JikanHttpError } from "./jikan-errors";
import {
	toJikanEpisodeDetailsResponse,
	toJikanEpisodesResponse,
	toJikanEpisodeVideosResponse,
} from "./jikan-response-normalizer";
import {
	readJikanHttpErrorDetails,
	readJikanSuccessPayload,
} from "./jikan-response-reader";

// In Electron main (CJS output with externalized deps), p-queue can resolve as either:
// - the constructor itself, or
// - a module namespace with `{ default: constructor }`.
// Normalize once so runtime always receives a constructable class.
const PQueueCtor = (PQueue as unknown as { default?: typeof PQueue }).default ?? PQueue;

// Serialize Jikan episode/detail/video requests through a conservative fixed-rate
// queue and log normalized provider outcomes. It performs no persistence or UI
// notification; errors propagate so hydration daemons own durable retry state.
// Call only through JikanAPI so no caller bypasses this limiter.
export class JikanEpisodesFetcher {
	private readonly queue: PQueue;

	constructor() {
		// One outbound Jikan request at a time; retry timing is handled by the DB-backed queue.
		this.queue = new PQueueCtor({
			interval:    2000,
			intervalCap: 1,
		});
	}

	public async fetchEpisodesPage(malId: number, page: number, priority: number = 0): Promise<JikanResponse> {
		const response = await this.queue.add<JikanResponse>(
			() => this.fetchEpisodesPageUnqueued(
				malId,
				page,
			),
			{ priority },
		);
		if (!response) {
			throw new Error(`Jikan queue returned no response for MAL ${ malId }, page ${ page }`);
		}
		return response;
	}

	public async fetchEpisodeVideosPage(malId: number, page: number, priority: number = 0): Promise<JikanEpisodeVideosResponse> {
		const response = await this.queue.add<JikanEpisodeVideosResponse>(
			() => this.fetchEpisodeVideosPageUnqueued(
				malId,
				page,
			),
			{ priority },
		);
		if (!response) {
			throw new Error(`Jikan queue returned no episode-videos response for MAL ${ malId }, page ${ page }`);
		}
		return response;
	}

	public async fetchEpisodeDetails(malId: number, episodeNumber: number, priority: number = 0): Promise<JikanEpisodeDetailsResponse> {
		const response = await this.queue.add<JikanEpisodeDetailsResponse>(
			() => this.fetchEpisodeDetailsUnqueued(
				malId,
				episodeNumber,
			),
			{ priority },
		);
		if (!response) {
			throw new Error(`Jikan queue returned no episode-details response for MAL ${ malId }, episode ${ episodeNumber }`);
		}
		return response;
	}

	private async fetchEpisodesPageUnqueued(malId: number, page: number): Promise<JikanResponse> {
		const url      = `https://api.jikan.moe/v4/anime/${ malId }/episodes?page=${ page }`;
		const response = await fetch(url);
		if (!response.ok) {
			throw new JikanHttpError(
				response.status,
				"episodes",
				malId,
				page,
				await readJikanHttpErrorDetails(
					response,
					url,
				),
			);
		}
		const {
						payload: rawPayload,
						details,
					}       = await readJikanSuccessPayload(
			response,
			url,
			"episodes",
			malId,
			page,
		);
		const payload = toJikanEpisodesResponse(
			rawPayload,
			{
				endpoint: "episodes",
				malId,
				page,
				status:   response.status,
				details,
			},
		);
		logJikanEpisodesPage(
			payload,
			{
				malId,
				page,
			},
		);
		return payload;
	}

	private async fetchEpisodeDetailsUnqueued(malId: number, episodeNumber: number): Promise<JikanEpisodeDetailsResponse> {
		const url      = `https://api.jikan.moe/v4/anime/${ malId }/episodes/${ episodeNumber }`;
		const response = await fetch(url);
		if (!response.ok) {
			throw new JikanHttpError(
				response.status,
				"episode-details",
				malId,
				episodeNumber,
				await readJikanHttpErrorDetails(
					response,
					url,
				),
			);
		}
		const {
						payload: rawPayload,
						details,
					} = await readJikanSuccessPayload(
			response,
			url,
			"episode-details",
			malId,
			episodeNumber,
		);

		return toJikanEpisodeDetailsResponse(
			rawPayload,
			{
				endpoint: "episode-details",
				malId,
				page:     episodeNumber,
				status:   response.status,
				details,
			},
		);
	}

	private async fetchEpisodeVideosPageUnqueued(malId: number, page: number): Promise<JikanEpisodeVideosResponse> {
		const url      = `https://api.jikan.moe/v4/anime/${ malId }/videos/episodes?page=${ page }`;
		const response = await fetch(url);
		// Episode-video data is thumbnail enrichment, not canonical episode data.
		// Jikan may legitimately have no listing for a title; preserve that as an
		// empty page rather than a user-facing episode update failure.
		if (response.status === 404) {
			const emptyResponse = {
				pagination: {
					last_visible_page: page,
					has_next_page:     false,
				},
				data:       [],
			};
			logJikanEpisodeVideosPage(
				emptyResponse,
				{
					malId,
					page,
					wasSynthesizedFrom404: true,
				},
			);
			return emptyResponse;
		}
		if (!response.ok) {
			throw new JikanHttpError(
				response.status,
				"episode-videos",
				malId,
				page,
				await readJikanHttpErrorDetails(
					response,
					url,
				),
			);
		}
		const {
						payload: rawPayload,
						details,
					}       = await readJikanSuccessPayload(
			response,
			url,
			"episode-videos",
			malId,
			page,
		);
		const payload = toJikanEpisodeVideosResponse(
			rawPayload,
			{
				endpoint: "episode-videos",
				malId,
				page,
				status:   response.status,
				details,
			},
		);
		logJikanEpisodeVideosPage(
			payload,
			{
				malId,
				page,
			},
		);
		return payload;
	}
}
