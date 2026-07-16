import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";

export function resolveGroupReleaseTimelineRef(
	groupSource: string | undefined,
	groupId: string | undefined,
): GroupRef | null {
	const numericGroupId = Number(groupId);
	if ((groupSource !== "official" && groupSource !== "user") || Number.isNaN(numericGroupId)) {
		return null;
	}

	return {
		source:  groupSource,
		groupId: numericGroupId,
	};
}

export function formatReleaseDate(timestamp: number | null): string {
	if (timestamp == null) {
		return "N/A";
	}
	return new Date(timestamp).toLocaleDateString();
}

export function formatMediaStatus(status: GroupReleaseTimelineRow["status"]): string {
	switch (status) {
		case "RELEASING":
			return "Ongoing";
		case "FINISHED":
			return "Finished";
		case "CANCELLED":
			return "Cancelled";
		case "HIATUS":
			return "Hiatus";
		case "NOT_YET_RELEASED":
			return "Not yet released";
		default:
			return "Unknown";
	}
}

export function formatNextAiringEpisode(row: GroupReleaseTimelineRow): string {
	if (row.status !== "RELEASING" || row.nextAiringEpisodeAt == null) {
		return "-";
	}

	const episode = row.nextAiringEpisodeNumber
		? `Episode ${ row.nextAiringEpisodeNumber }`
		: "Next episode";
	return `${ episode } - ${ formatReleaseDate(row.nextAiringEpisodeAt) }`;
}
