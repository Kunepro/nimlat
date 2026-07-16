import {
	expect,
	test,
} from "@playwright/test";
import {
	readRendererEvents,
	startRendererEventRecorder,
	stopRendererEventRecorder,
} from "../e2e-renderer-api";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import { evaluateRenderer } from "../playwright-electron-helpers";

export function registerMediaLifecycleTests(context: NimlatE2ETestContext): void {
	test(
		"media refresh and inspection",
		async () => {
			const basePage      = context.getBasePage();
			const { ids }       = context.getSnapshot();
			const refreshResult = await evaluateRenderer<{ success: boolean }>(
				basePage,
				`window.electronAPI.groupExplorer.refreshMedia(${ ids.baseMedia })`,
			);
			expect(refreshResult.success).toBe(true);

			const mediaInspection = await evaluateRenderer<{ description?: string | null } | null>(
				basePage,
				`window.electronAPI.groupExplorer.getMediaInspection(${ ids.baseMedia })`,
			);
			expect(mediaInspection?.description).toBe("Refreshed description from mocked provider");
		},
	);

	test(
		"integration and playback state through renderer IPC",
		async () => {
			const basePage          = context.getBasePage();
			const { ids }           = context.getSnapshot();
			const integrationResult = await evaluateRenderer<{ success: boolean }>(
				basePage,
				`window.electronAPI.groupExplorer.setMediaIntegrationStatus({ mediaId: ${ ids.filmMedia }, integrationStatus: 'integrated' })`,
			);
			expect(integrationResult.success).toBe(true);

			const saveStateResult = await evaluateRenderer<{ success: boolean }>(
				basePage,
				`window.electronAPI.groupExplorer.saveMediaIntegrationState({
					mediaId: ${ ids.filmMedia },
					integrationStatus: 'integrated',
					playbackIssueNote: 'artifact',
					hasDubIssue: false,
					hasSubIssue: false,
					hasEncodingIssue: false,
					hasAudioIssue: false,
					hasVideoIssue: true,
					playbackIssueMoments: [{ playbackIssueCategory: 'video', timeSeconds: 42, note: 'artifact' }]
				})`,
			);
			expect(saveStateResult.success).toBe(true);

			const filmInspection = await evaluateRenderer<{
				integrationStatus?: string | null;
				integrationPercent?: number | null;
				playbackIssueMoments?: Array<{ timeSeconds: number }>;
			} | null>(
				basePage,
				`window.electronAPI.groupExplorer.getMediaInspection(${ ids.filmMedia })`,
			);
			expect(filmInspection?.integrationStatus).toBe("integrated");
			expect(filmInspection?.integrationPercent).toBe(70);
			expect(filmInspection?.playbackIssueMoments?.[ 0 ]?.timeSeconds).toBe(42);
		},
	);

	test(
		"metadata edits, watch state, and episode overrides through renderer IPC",
		async () => {
			const basePage = context.getBasePage();
			const {
							ids,
							groupIds,
						}        = context.getSnapshot();
			await startRendererEventRecorder(
				basePage,
				"groupMediaItemsPatched",
			);
			await startRendererEventRecorder(
				basePage,
				"mediaEpisodesItemsPatched",
			);
			const result = await evaluateRenderer<{
				groupEdit: { success: boolean; error?: string };
				groupInspectionName?: string;
				groupWatchResult: { success: boolean; error?: string };
				allGroupMediasWatched: boolean;
				mediaEdit: { success: boolean; error?: string };
				mediaNameAfterEdit?: string;
				mediaDescriptionAfterEdit?: string;
				mediaReset: { success: boolean; error?: string };
				mediaDescriptionAfterReset?: string;
				mediaWatchResult: { success: boolean; error?: string };
				isBaseMediaWatched?: boolean;
				episodeEdit: { success: boolean; error?: string };
				episodeNameAfterEdit?: string;
				episodeWatchResult: { success: boolean; error?: string };
				isEpisodeWatchedAfterEdit?: boolean;
				episodeReset: { success: boolean; error?: string };
				episodeNameAfterReset?: string;
			}>(
				basePage,
				`(async () => {
					const groupRef = { source: "official", groupId: ${ groupIds.sourceGroupId } };
					const groupEdit = await window.electronAPI.groupExplorer.saveGroupEdit({
						group: groupRef,
						name: "E2E Source Group Override",
						description: "E2E group override description",
						selections: [],
					});
					const groupInspectionAfterEdit = await window.electronAPI.groupExplorer.getInspectionSummary(groupRef);
					const groupWatchResult = await window.electronAPI.groupExplorer.setGroupWatchState({
						group: groupRef,
						isWatched: true,
					});
					const groupInspectionAfterWatch = await window.electronAPI.groupExplorer.getInspectionSummary(groupRef);

					const mediaEdit = await window.electronAPI.groupExplorer.saveMediaEdit({
						mediaId: ${ ids.baseMedia },
						name: "E2E Base Media Override",
						description: "E2E media override description",
						selections: [],
					});
					const mediaAfterEdit = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.baseMedia });
					const mediaWatchResult = await window.electronAPI.groupExplorer.setMediaWatchState({
						mediaIds: [${ ids.baseMedia }],
						isWatched: true,
					});
					const mediaAfterWatch = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.baseMedia });
					const mediaReset = await window.electronAPI.groupExplorer.resetMediaDetails({
						mediaId: ${ ids.baseMedia },
					});
					const mediaAfterReset = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.baseMedia });

					const episodeEdit = await window.electronAPI.groupExplorer.saveEpisodeEdit({
						mediaId: ${ ids.noThumbnailMedia },
						episodeNumber: 1,
						name: "E2E Episode Override",
						selections: [],
					});
					const episodeAfterEditMedia = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.noThumbnailMedia });
					const episodeWatchResult = await window.electronAPI.groupExplorer.setEpisodeWatchState({
						mediaId: ${ ids.noThumbnailMedia },
						episodeNumber: 1,
						isWatched: true,
					});
					const episodeAfterWatchMedia = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.noThumbnailMedia });
					const episodeReset = await window.electronAPI.groupExplorer.resetEpisodeDetails({
						mediaId: ${ ids.noThumbnailMedia },
						episodeNumber: 1,
					});
					const episodeAfterResetMedia = await window.electronAPI.groupExplorer.getMediaInspection(${ ids.noThumbnailMedia });

					return {
						groupEdit,
						groupInspectionName: groupInspectionAfterEdit?.name,
						groupWatchResult,
						allGroupMediasWatched: groupInspectionAfterWatch
							? groupInspectionAfterWatch.mediasCount > 0
								&& groupInspectionAfterWatch.watchedMediasCount === groupInspectionAfterWatch.mediasCount
							: false,
						mediaEdit,
						mediaNameAfterEdit: mediaAfterEdit?.name,
						mediaDescriptionAfterEdit: mediaAfterEdit?.description,
						mediaReset,
						mediaDescriptionAfterReset: mediaAfterReset?.description,
						mediaWatchResult,
						isBaseMediaWatched: mediaAfterWatch?.isWatched,
						episodeEdit,
						episodeNameAfterEdit: episodeAfterEditMedia?.episodes.find((episode) => episode.episodeNumber === 1)?.name,
						episodeWatchResult,
						isEpisodeWatchedAfterEdit: episodeAfterWatchMedia?.episodes.find((episode) => episode.episodeNumber === 1)?.isWatched,
						episodeReset,
						episodeNameAfterReset: episodeAfterResetMedia?.episodes.find((episode) => episode.episodeNumber === 1)?.name,
					};
				})()`,
			);

			expect(
				result.groupEdit.success,
				result.groupEdit.error,
			).toBe(true);
			expect(result.groupInspectionName).toBe("E2E Source Group Override");
			expect(
				result.groupWatchResult.success,
				result.groupWatchResult.error,
			).toBe(true);
			expect(result.allGroupMediasWatched).toBe(true);
			expect(
				result.mediaEdit.success,
				result.mediaEdit.error,
			).toBe(true);
			expect(result.mediaNameAfterEdit).toBe("E2E Base Media Override");
			expect(result.mediaDescriptionAfterEdit).toBe("E2E media override description");
			expect(
				result.mediaWatchResult.success,
				result.mediaWatchResult.error,
			).toBe(true);
			expect(result.isBaseMediaWatched).toBe(true);
			expect(
				result.mediaReset.success,
				result.mediaReset.error,
			).toBe(true);
			expect(result.mediaDescriptionAfterReset).toBe("Refreshed description from mocked provider");
			expect(
				result.episodeEdit.success,
				result.episodeEdit.error,
			).toBe(true);
			expect(result.episodeNameAfterEdit).toBe("E2E Episode Override");
			expect(
				result.episodeWatchResult.success,
				result.episodeWatchResult.error,
			).toBe(true);
			expect(result.isEpisodeWatchedAfterEdit).toBe(true);
			expect(
				result.episodeReset.success,
				result.episodeReset.error,
			).toBe(true);
			expect(result.episodeNameAfterReset).toBe("E2E Episode 1");

			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"groupMediaItemsPatched",
				);
				return events.some((event) =>
					event.patches.some((patch) => patch.mediaId === ids.baseMedia),
				);
			}).toBe(true);
			const groupMediaPatchEvents = await readRendererEvents(
				basePage,
				"groupMediaItemsPatched",
			);
			expect(groupMediaPatchEvents.every((event) =>
				event.patches.every((patch) => Number.isInteger(patch.mediaId)),
			)).toBe(true);

			await expect.poll(async () => {
				const events = await readRendererEvents(
					basePage,
					"mediaEpisodesItemsPatched",
				);
				return events.some((event) =>
					event.mediaId === ids.noThumbnailMedia
					&& event.patches.some((patch) => patch.episodeNumber === 1),
				);
			}).toBe(true);
			const episodePatchEvents = await readRendererEvents(
				basePage,
				"mediaEpisodesItemsPatched",
			);
			expect(episodePatchEvents.every((event) =>
				Number.isInteger(event.mediaId)
				&& event.patches.every((patch) => Number.isInteger(patch.episodeNumber)),
			)).toBe(true);

			await stopRendererEventRecorder(
				basePage,
				"groupMediaItemsPatched",
			);
			await stopRendererEventRecorder(
				basePage,
				"mediaEpisodesItemsPatched",
			);
		},
	);
}
