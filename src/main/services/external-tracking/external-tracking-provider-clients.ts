import { typeSafeError } from "@nimlat/functions";
import type { ExternalTrackingProvider } from "@nimlat/types/external-tracking";
import { AniListTrackingClient } from "./external-tracking-anilist-client";
import { KitsuTrackingClient } from "./external-tracking-kitsu-client";
import { MyAnimeListTrackingClient } from "./external-tracking-mal-client";
import type { ExternalTrackingProviderClient } from "./external-tracking-providers";
import { SimklTrackingClient } from "./external-tracking-simkl-client";

const clients: Record<ExternalTrackingProvider, ExternalTrackingProviderClient | null> = {
	mal:     new MyAnimeListTrackingClient(),
	anilist: new AniListTrackingClient(),
	simkl:   new SimklTrackingClient(),
	kitsu: new KitsuTrackingClient(),
};

export function getExternalTrackingProviderClient(provider: ExternalTrackingProvider): ExternalTrackingProviderClient {
	const client = clients[ provider ];
	if (!client) {
		throw new Error(`${ provider } tracking is not supported yet.`);
	}

	return client;
}

export function getExternalTrackingErrorMessage(error: unknown): string {
	const typed = typeSafeError(error);
	return typed.message;
}
