import { isTrackedIntegrationStatus } from "@nimlat/constants/integration-status";
import {
	GroupInspectionMediaCard,
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import type { MediaWallItem } from "../types/media-wall";

function formatMediaType(value?: string): string | undefined {
	if (!value) {
		return undefined;
	}
	const parts = value
		.split("_")
		.filter(Boolean);
	if (parts.length === 0) {
		return undefined;
	}

	// Canvas media cards use compact format tokens; keeping every segment
	// uppercase avoids mixed labels like "Movie" beside acronym labels like "TV".
	return parts
		.map(part => part.toUpperCase())
		.join(" ");
}

export function mapLibraryDisplayItemToMediaWallItem(item: LibraryDisplayItem, scope: LibraryDisplayScope = "library"): MediaWallItem {
	const formattedMediaType = formatMediaType(item.format);
	return {
		id:              item.key,
		title:           item.name,
		subtitle:        item.kind === "group" ? undefined : formattedMediaType,
		description:     item.description,
		thumbnailUrl:    item.displayImageUrl || item.imageUrl,
		progressPercent: isTrackedIntegrationStatus(item.integrationStatus ?? null)
											 ? item.integrationPercent ?? undefined
											 : undefined,
		integrationStatus: item.integrationStatus ?? null,
		isAdult:         item.isAdult,
		isWatched:       item.isWatched,
		mediaCount:      item.kind === "group" ? item.mediasCount : undefined,
		kind:            scope === "ignored" ? "ignored" : "library",
	};
}

export function mapGroupMediaCardToMediaWallItem(item: GroupInspectionMediaCard): MediaWallItem {
	const formattedMediaType = formatMediaType(item.format);
	const badges = [
		formattedMediaType,
		item.hasPlaybackIssue ? "Playback issue" : undefined,
		item.hasHydrationIssue ? "Hydration issue" : undefined,
	].filter((value): value is string => Boolean(value));

	return {
		id:              `media:${ item.mediaId }`,
		title:           item.name,
		subtitle:        formattedMediaType,
		description:     item.description,
		thumbnailUrl:    item.displayImageUrl || item.imageUrl,
		progressPercent: isTrackedIntegrationStatus(item.integrationStatus ?? null)
											 ? item.integrationPercent ?? undefined
											 : undefined,
		integrationStatus: item.integrationStatus ?? null,
		badges,
		isAdult:         item.isAdult,
		isWatched:       item.isWatched,
		kind:            "group-media",
	};
}
