// @vitest-environment node

import type {
	MediaEpisodeInspectionRow,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	appendUniqueEpisodeNumbers,
	createEpisodeIntegrationStatusMap,
	createEpisodeWatchedStateMap,
	formatEpisodeMutationError,
	getEmptyEpisodeMessage,
	getEpisodeBulkSelectionState,
	getEpisodeEditInitialDescription,
	getEpisodeNumberList,
	getEpisodeThumbnailSource,
	getFallbackEpisodeThumbnail,
	getPartialEpisodeListDescription,
	getPartialEpisodeListMessage,
	getSelectedEpisodeNumberList,
	hasPartialEpisodeList,
	isEpisodeUpdateStatusActive,
	patchEpisodeIntegrationStatuses,
	patchEpisodeWatchedStates,
	patchMediaEpisodes,
	patchMediaEpisodesFromEvent,
	pruneUnavailableEpisodeSelection,
	removeEpisodeNumbers,
	restoreEpisodeIntegrationStatuses,
	restoreEpisodeWatchedStates,
	shouldApplyMediaEpisodesPatchEvent,
	shouldRefreshMediaEpisodesForListChange,
	sortMediaEpisodes,
	toEpisodeNumberSet,
} from "./media-episodes-explorer-model";

function createEpisode(episodeNumber: number): MediaEpisodeInspectionRow {
	return {
		mediaId:           1,
		episodeNumber,
		name:              `Episode ${ episodeNumber }`,
		integrationStatus: null,
		isWatched:         false,
	} as MediaEpisodeInspectionRow;
}

function createMedia(episodes: MediaEpisodeInspectionRow[]): MediaInspectionData {
	return {
		mediaId:                           1,
		name:                              "Media",
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes,
		episodesCount:                     3,
		jikanEpisodesCoverageStatus:       "available",
	};
}

describe(
	"media-episodes-explorer-model",
	() => {
		it(
			"derives ordered, selected, and updating episode number collections",
			() => {
				const episodes = sortMediaEpisodes(createMedia([
					createEpisode(3),
					createEpisode(1),
					createEpisode(2),
				]));

				expect(getEpisodeNumberList(episodes)).toEqual([
					1,
					2,
					3,
				]);
				expect(getSelectedEpisodeNumberList(
					getEpisodeNumberList(episodes),
					new Set([
						3,
						1,
					]),
				)).toEqual([
					1,
					3,
				]);
				expect(Array.from(toEpisodeNumberSet([
					2,
					2,
				]))).toEqual([ 2 ]);
				expect(getEpisodeBulkSelectionState(
					0,
					3,
				)).toBe("none");
				expect(getEpisodeBulkSelectionState(
					2,
					3,
				)).toBe("partial");
				expect(getEpisodeBulkSelectionState(
					3,
					3,
				)).toBe("all");
			},
		);

		it(
			"builds episode status messages and partial-list state",
			() => {
				expect(isEpisodeUpdateStatusActive("pending")).toBe(true);
				expect(isEpisodeUpdateStatusActive("processing")).toBe(true);
				expect(isEpisodeUpdateStatusActive("failed")).toBe(false);
				expect(getEmptyEpisodeMessage(
					createMedia([]),
					true,
				)).toBe("Episodes are being loaded. Check back in a moment.");
				expect(getEmptyEpisodeMessage(
					{
						...createMedia([]),
						jikanEpisodesCoverageStatus: "empty",
					},
					false,
				)).toBe("Episode intel unavailable. Count known: 3.");
				expect(getEmptyEpisodeMessage(
					{
						...createMedia([]),
						episodesCount:               1,
						jikanEpisodesCoverageStatus: "empty",
					},
					false,
				)).toBe("Episode intel unavailable. Count known: 1.");
				expect(hasPartialEpisodeList(
					createMedia([ createEpisode(1) ]),
					[ createEpisode(1) ],
				)).toBe(true);
				expect(getPartialEpisodeListMessage(
					1,
					3,
				)).toBe("1 of 3 episodes are available");
				expect(getPartialEpisodeListDescription(true)).toBe("More episodes are still being loaded.");
				expect(getPartialEpisodeListDescription(false)).toBe("Refresh episodes to check whether the missing entries are available now.");
			},
		);

		it(
			"resolves episode thumbnail sources with media-level fallbacks",
			() => {
				const placeholder = "placeholder.png";
				const media       = {
					...createMedia([]),
					bannerImage:           "banner.jpg",
					displayBannerImageUrl: "display-banner.jpg",
					displayImageUrl:       "display-cover.jpg",
					imageUrl:              "cover.jpg",
				};
				const fallback    = getFallbackEpisodeThumbnail(
					media,
					placeholder,
				);

				expect(fallback).toBe("banner.jpg");
				expect(getFallbackEpisodeThumbnail(
					{
						...createMedia([]),
						bannerImage:     undefined,
						displayImageUrl: "display-cover.jpg",
					},
					placeholder,
				)).toBe("display-cover.jpg");
				expect(getFallbackEpisodeThumbnail(
					createMedia([]),
					placeholder,
				)).toBe(placeholder);
				expect(getEpisodeThumbnailSource(
					{
						...createEpisode(1),
						thumbnail:           "provider-thumb.jpg",
						displayThumbnailUrl: "display-thumb.jpg",
					},
					fallback,
				)).toBe("display-thumb.jpg");
				expect(getEpisodeThumbnailSource(
					{
						...createEpisode(1),
						thumbnail: "provider-thumb.jpg",
					},
					fallback,
				)).toBe("provider-thumb.jpg");
				expect(getEpisodeThumbnailSource(
					createEpisode(1),
					fallback,
				)).toBe(fallback);
				expect(getEpisodeEditInitialDescription({
					...createEpisode(1),
					description: "Local description",
					recap:       "Provider recap",
				})).toBe("Local description");
				expect(getEpisodeEditInitialDescription({
					...createEpisode(1),
					recap: "Provider recap",
				})).toBe("Provider recap");
			},
		);

		it(
			"updates episode number lists immutably",
			() => {
				expect(appendUniqueEpisodeNumbers(
					[
						1,
						2,
					],
					[
						2,
						3,
					],
				)).toEqual([
					1,
					2,
					3,
				]);
				expect(removeEpisodeNumbers(
					[
						1,
						2,
						3,
					],
					[ 2 ],
				)).toEqual([
					1,
					3,
				]);
				expect(Array.from(pruneUnavailableEpisodeSelection(
					new Set([
						1,
						3,
					]),
					new Set([
						1,
						2,
					]),
				))).toEqual([ 1 ]);
			},
		);

		it(
			"formats mutation errors with a safe fallback",
			() => {
				expect(formatEpisodeMutationError(
					new Error("write failed"),
					"fallback",
				)).toBe("write failed");
				expect(formatEpisodeMutationError(
					{ message: "not trusted" },
					"fallback",
				)).toBe("fallback");
			},
		);

		it(
			"patches matching episodes without mutating the source media snapshot",
			() => {
				const media        = createMedia([
					createEpisode(1),
					createEpisode(2),
				]);
				const patchedMedia = patchMediaEpisodes(
					media,
					episode => episode.episodeNumber === 2,
					() => ({ isWatched: true }),
				);

				expect(patchedMedia).not.toBe(media);
				expect(patchedMedia?.episodes[ 0 ]).toBe(media.episodes[ 0 ]);
				expect(patchedMedia?.episodes[ 1 ]).not.toBe(media.episodes[ 1 ]);
				expect(patchedMedia?.episodes[ 1 ].isWatched).toBe(true);
				expect(media.episodes[ 1 ].isWatched).toBe(false);
			},
		);

		it(
			"creates exact rollback snapshots for episode status and watched edits",
			() => {
				const episodes = [
					{
						...createEpisode(1),
						integrationStatus: "tracked" as const,
						isWatched:         true,
					},
					createEpisode(2),
				];

				expect(Array.from(createEpisodeIntegrationStatusMap(episodes))).toEqual([
					[
						1,
						"tracked",
					],
					[
						2,
						null,
					],
				]);
				expect(Array.from(createEpisodeWatchedStateMap(episodes))).toEqual([
					[
						1,
						true,
					],
					[
						2,
						false,
					],
				]);
			},
		);

		it(
			"applies and restores episode status and watched patches by episode number",
			() => {
				const media               = createMedia([
					{
						...createEpisode(1),
						integrationStatus: "tracked",
						isWatched:         true,
					},
					createEpisode(2),
				]);
				const statusSnapshot      = createEpisodeIntegrationStatusMap(media.episodes);
				const watchedSnapshot     = createEpisodeWatchedStateMap(media.episodes);
				const patchedStatusMedia  = patchEpisodeIntegrationStatuses(
					media,
					[
						1,
						2,
					],
					"downloaded",
				);
				const patchedWatchedMedia = patchEpisodeWatchedStates(
					patchedStatusMedia,
					[ 2 ],
					true,
				);

				expect(patchedWatchedMedia?.episodes.map(episode => episode.integrationStatus)).toEqual([
					"downloaded",
					"downloaded",
				]);
				expect(patchedWatchedMedia?.episodes.map(episode => episode.isWatched)).toEqual([
					true,
					true,
				]);

				const restoredStatusMedia  = restoreEpisodeIntegrationStatuses(
					patchedWatchedMedia,
					[
						1,
						2,
					],
					statusSnapshot,
				);
				const restoredWatchedMedia = restoreEpisodeWatchedStates(
					restoredStatusMedia,
					[
						1,
						2,
					],
					watchedSnapshot,
				);

				expect(restoredWatchedMedia?.episodes.map(episode => episode.integrationStatus ?? null)).toEqual([
					"tracked",
					null,
				]);
				expect(restoredWatchedMedia?.episodes.map(episode => episode.isWatched)).toEqual([
					true,
					false,
				]);
			},
		);

		it(
			"scopes episode list and patch events to the active media",
			() => {
				expect(shouldRefreshMediaEpisodesForListChange(
					1,
					{ mediaId: 1 },
				)).toBe(true);
				expect(shouldRefreshMediaEpisodesForListChange(
					1,
					{ mediaId: 2 },
				)).toBe(false);
				expect(shouldApplyMediaEpisodesPatchEvent(
					1,
					{
						mediaId: 1,
						patches: [
							{
								episodeNumber: 1,
								isWatched:     true,
							},
						],
					},
				)).toBe(true);
				expect(shouldApplyMediaEpisodesPatchEvent(
					1,
					{
						mediaId: 1,
						patches: [],
					},
				)).toBe(false);
				expect(shouldApplyMediaEpisodesPatchEvent(
					1,
					{
						mediaId: 2,
						patches: [
							{
								episodeNumber: 1,
								isWatched:     true,
							},
						],
					},
				)).toBe(false);
			},
		);

		it(
			"applies episode item patch events through the shared patcher",
			() => {
				const media        = createMedia([
					createEpisode(1),
					createEpisode(2),
				]);
				const patchedMedia = patchMediaEpisodesFromEvent(
					media,
					{
						mediaId: 1,
						patches: [
							{
								episodeNumber:     2,
								isWatched:         true,
								integrationStatus: "tracked",
							},
						],
					},
				);

				expect(patchedMedia).not.toBe(media);
				expect(patchedMedia?.episodes[ 0 ]).toBe(media.episodes[ 0 ]);
				expect(patchedMedia?.episodes[ 1 ]).toEqual({
					...media.episodes[ 1 ],
					isWatched:         true,
					integrationStatus: "tracked",
				});
			},
		);
	},
);
