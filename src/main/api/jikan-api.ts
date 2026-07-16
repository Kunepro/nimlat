import {
	JikanEpisodeDetailsResponse,
	JikanEpisodeVideosResponse,
	JikanResponse,
} from "@nimlat/types/jikan-api";
import { JikanEpisodesFetcher } from "./jikan/jikan-episodes-fetcher";

export class JikanAPI {
	// Single Jikan entrypoint. The fetcher serializes requests and emits bounded
	// diagnostics; persistence, retry state, and UI effects remain daemon-owned.
	private static readonly episodesFetcher = new JikanEpisodesFetcher();

	// Fetch one canonical-episode source page by provider-native MAL identity.
	static loadEpisodesPageForMedia(malId: number, page: number, priority: number = 0): Promise<JikanResponse> {
		return JikanAPI.episodesFetcher.fetchEpisodesPage(
			malId,
			page,
			priority,
		);
	}

	// Fetch one thumbnail-enrichment page independently from episode synchronization.
	static loadEpisodeVideosPageForMedia(malId: number, page: number, priority: number = 0): Promise<JikanEpisodeVideosResponse> {
		return JikanAPI.episodesFetcher.fetchEpisodeVideosPage(
			malId,
			page,
			priority,
		);
	}

	static loadEpisodeDetailsForMedia(malId: number, episodeNumber: number, priority: number = 0): Promise<JikanEpisodeDetailsResponse> {
		return JikanAPI.episodesFetcher.fetchEpisodeDetails(
			malId,
			episodeNumber,
			priority,
		);
	}
}
