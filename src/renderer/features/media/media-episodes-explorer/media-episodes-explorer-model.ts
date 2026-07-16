import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	MediaEpisodeInspectionRow,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";

export const EPISODE_REFRESH_SETTLE_PROBE_LIMIT = 3;
export const EPISODE_ROW_HEIGHT                 = 124;
export const EPISODE_ROW_GAP                    = 8;

export type EpisodeBulkSelectionState = "none" | "partial" | "all";

const ACTIVE_EPISODE_UPDATE_STATUSES = new Set([
	"pending",
	"processing",
]);

export function sortMediaEpisodes(media: MediaInspectionData | null): MediaEpisodeInspectionRow[] {
	return (media?.episodes ?? []).slice().sort((left, right) => left.episodeNumber - right.episodeNumber);
}

export function getEpisodeNumberList(episodes: MediaEpisodeInspectionRow[]): number[] {
	return episodes.map(episode => episode.episodeNumber);
}

export function getSelectedEpisodeNumberList(
	orderedEpisodeNumbers: readonly number[],
	selectedEpisodeNumbers: ReadonlySet<number>,
): number[] {
	return orderedEpisodeNumbers.filter(episodeNumber => selectedEpisodeNumbers.has(episodeNumber));
}

export function toEpisodeNumberSet(episodeNumbers: readonly number[]): ReadonlySet<number> {
	return new Set(episodeNumbers);
}

export function getEpisodeBulkSelectionState(selectedCount: number, totalCount: number): EpisodeBulkSelectionState {
	if (totalCount <= 0 || selectedCount <= 0) {
		return "none";
	}

	return selectedCount >= totalCount ? "all" : "partial";
}

export function isEpisodeUpdateStatusActive(status?: string | null): boolean {
	return status ? ACTIVE_EPISODE_UPDATE_STATUSES.has(status) : false;
}

export function getEmptyEpisodeMessage(
	media: MediaInspectionData | null,
	isEpisodeUpdateActive: boolean,
): string {
	if (isEpisodeUpdateActive) {
		return "Episodes are being loaded. Check back in a moment.";
	}

	if (media?.jikanEpisodesCoverageStatus === "empty") {
		if (media.episodesCount === 1) {
			return "Episode intel unavailable. Count known: 1.";
		}

		if (typeof media.episodesCount === "number" && media.episodesCount > 1) {
			return `Episode intel unavailable. Count known: ${ media.episodesCount }.`;
		}

		return "Episode intel unavailable.";
	}

	return "Episodes are still being added. Check back in a moment.";
}

export function hasPartialEpisodeList(
	media: MediaInspectionData | null,
	episodes: readonly MediaEpisodeInspectionRow[],
): boolean {
	return typeof media?.episodesCount === "number"
		&& episodes.length > 0
		&& episodes.length < media.episodesCount;
}

export function shouldRefreshMediaEpisodesForListChange(
	mediaId: number,
	event: MediaEpisodesListChangedEvent,
): boolean {
	return event.mediaId === mediaId;
}

export function shouldApplyMediaEpisodesPatchEvent(
	mediaId: number,
	event: MediaEpisodesItemsPatchedEvent,
): boolean {
	return event.mediaId === mediaId && event.patches.length > 0;
}

export function getFallbackEpisodeThumbnail(
	media: MediaInspectionData,
	placeholderUrl: string,
): string {
	return media.bannerImage || media.displayBannerImageUrl || media.displayImageUrl || media.imageUrl || placeholderUrl;
}

export function getEpisodeThumbnailSource(
	episode: MediaEpisodeInspectionRow,
	fallbackEpisodeThumbnail: string,
): string {
	return episode.displayThumbnailUrl || episode.thumbnail || fallbackEpisodeThumbnail;
}

export function getEpisodeEditInitialDescription(episode: MediaEpisodeInspectionRow): string {
	return episode.description || episode.recap || "";
}

export function getPartialEpisodeListMessage(
	loadedEpisodeCount: number,
	expectedEpisodeCount: number,
): string {
	return `${ loadedEpisodeCount } of ${ expectedEpisodeCount } episodes are available`;
}

export function getPartialEpisodeListDescription(isEpisodeUpdateActive: boolean): string {
	return isEpisodeUpdateActive
		? "More episodes are still being loaded."
		: "Refresh episodes to check whether the missing entries are available now.";
}

export function appendUniqueEpisodeNumbers(
	currentEpisodeNumbers: readonly number[],
	episodeNumbersToAppend: readonly number[],
): number[] {
	const nextEpisodeNumbers = new Set(currentEpisodeNumbers);
	episodeNumbersToAppend.forEach(episodeNumber => nextEpisodeNumbers.add(episodeNumber));
	return Array.from(nextEpisodeNumbers);
}

export function removeEpisodeNumbers(
	currentEpisodeNumbers: readonly number[],
	episodeNumbersToRemove: readonly number[],
): number[] {
	const episodeNumbersToRemoveSet = new Set(episodeNumbersToRemove);
	return currentEpisodeNumbers.filter(episodeNumber => !episodeNumbersToRemoveSet.has(episodeNumber));
}

export function formatEpisodeMutationError(error: unknown, fallbackMessage: string): string {
	return error instanceof Error ? error.message : fallbackMessage;
}

export function pruneUnavailableEpisodeSelection(
	currentSelection: ReadonlySet<number>,
	availableEpisodeNumbers: ReadonlySet<number>,
): ReadonlySet<number> {
	const nextSelection = new Set(Array.from(currentSelection).filter(episodeNumber => availableEpisodeNumbers.has(episodeNumber)));
	return nextSelection.size === currentSelection.size ? currentSelection : nextSelection;
}

// Keep optimistic episode updates immutable and centralized so status/watch rollbacks
// cannot accidentally mutate the current inspection snapshot shared by virtual rows.
export function patchMediaEpisodes(
	currentMedia: MediaInspectionData | null,
	shouldPatchEpisode: (episode: MediaEpisodeInspectionRow) => boolean,
	createEpisodePatch: (episode: MediaEpisodeInspectionRow) => Partial<MediaEpisodeInspectionRow>,
): MediaInspectionData | null {
	if (!currentMedia) {
		return currentMedia;
	}

	let didPatchEpisode = false;
	const episodes      = currentMedia.episodes.map((episode) => {
		if (!shouldPatchEpisode(episode)) {
			return episode;
		}

		didPatchEpisode = true;
		return {
			...episode,
			...createEpisodePatch(episode),
		};
	});

	return didPatchEpisode
		? {
			...currentMedia,
			episodes,
		}
		: currentMedia;
}

export function patchMediaEpisodesFromEvent(
	currentMedia: MediaInspectionData | null,
	event: MediaEpisodesItemsPatchedEvent,
): MediaInspectionData | null {
	const patchesByEpisodeNumber = new Map(event.patches.map(patch => [
		patch.episodeNumber,
		patch,
	]));

	return patchMediaEpisodes(
		currentMedia,
		episode => patchesByEpisodeNumber.has(episode.episodeNumber),
		episode => patchesByEpisodeNumber.get(episode.episodeNumber) ?? {},
	);
}

export function createEpisodeIntegrationStatusMap(
	episodes: readonly MediaEpisodeInspectionRow[],
): ReadonlyMap<number, IntegrationStatus | null> {
	return new Map(episodes.map(episode => [
		episode.episodeNumber,
		episode.integrationStatus ?? null,
	]));
}

export function createEpisodeWatchedStateMap(
	episodes: readonly MediaEpisodeInspectionRow[],
): ReadonlyMap<number, boolean> {
	return new Map(episodes.map(episode => [
		episode.episodeNumber,
		episode.isWatched === true,
	]));
}

export function patchEpisodeIntegrationStatuses(
	currentMedia: MediaInspectionData | null,
	episodeNumbers: readonly number[],
	integrationStatus: IntegrationStatus | null,
): MediaInspectionData | null {
	const episodeNumberSet = new Set(episodeNumbers);
	return patchMediaEpisodes(
		currentMedia,
		episode => episodeNumberSet.has(episode.episodeNumber),
		() => ({ integrationStatus }),
	);
}

export function restoreEpisodeIntegrationStatuses(
	currentMedia: MediaInspectionData | null,
	episodeNumbers: readonly number[],
	previousStatusesByEpisodeNumber: ReadonlyMap<number, IntegrationStatus | null>,
): MediaInspectionData | null {
	const episodeNumberSet = new Set(episodeNumbers);
	return patchMediaEpisodes(
		currentMedia,
		episode => episodeNumberSet.has(episode.episodeNumber),
		episode => ({ integrationStatus: previousStatusesByEpisodeNumber.get(episode.episodeNumber) ?? null }),
	);
}

export function patchEpisodeWatchedStates(
	currentMedia: MediaInspectionData | null,
	episodeNumbers: readonly number[],
	isWatched: boolean,
): MediaInspectionData | null {
	const episodeNumberSet = new Set(episodeNumbers);
	return patchMediaEpisodes(
		currentMedia,
		episode => episodeNumberSet.has(episode.episodeNumber),
		() => ({ isWatched }),
	);
}

export function restoreEpisodeWatchedStates(
	currentMedia: MediaInspectionData | null,
	episodeNumbers: readonly number[],
	previousWatchedByEpisodeNumber: ReadonlyMap<number, boolean>,
): MediaInspectionData | null {
	const episodeNumberSet = new Set(episodeNumbers);
	return patchMediaEpisodes(
		currentMedia,
		episode => episodeNumberSet.has(episode.episodeNumber),
		episode => ({ isWatched: previousWatchedByEpisodeNumber.get(episode.episodeNumber) ?? false }),
	);
}
