import type { ReleaseDateSource } from "@nimlat/types/release-watch";

const RELEASE_DATE_SOURCE_LABELS: Record<ReleaseDateSource, string> = {
	next_airing_episode: "Date from the next scheduled episode",
	media_start_date:    "Date from the anime start date",
	provider_release_at: "Date from release data",
	none:                "No release date found",
};

export function getReleaseDateSourceLabel(source: ReleaseDateSource): string {
	return RELEASE_DATE_SOURCE_LABELS[ source ];
}
