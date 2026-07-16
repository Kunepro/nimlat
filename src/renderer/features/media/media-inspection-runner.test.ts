// @vitest-environment jsdom

import type {
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	GroupExplorerFacade,
	UserConfigFacade,
} from "../../facades";
import {
	getMediaInspection,
	groupMediaItemsPatched,
	groupMediaListChanges,
	mediaEpisodesItemsPatched,
	mediaEpisodesListChanges,
	preferredTitleLanguageChanges,
} from "./media-inspection-runner";

function createMediaInspection(mediaId: number): MediaInspectionData {
	return {
		mediaId,
		name:                              `Media ${ mediaId }`,
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [],
	};
}

describe(
	"media-inspection-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads media inspections through the group explorer facade",
			async () => {
				const media = createMediaInspection(7);
				vi.spyOn(
					GroupExplorerFacade,
					"getMediaInspection",
				).mockResolvedValue(media);

				await expect(getMediaInspection(
					7,
					{ includeEpisodes: false },
				)).resolves.toBe(media);

				expect(GroupExplorerFacade.getMediaInspection).toHaveBeenCalledWith(
					7,
					{ includeEpisodes: false },
				);
			},
		);

		it(
			"exposes media inspection invalidation and patch streams",
			() => {
				const groupList$            = new Subject<GroupMediaListChangedEvent>();
				const groupPatches$         = new Subject<GroupMediaItemsPatchedEvent>();
				const episodeList$          = new Subject<MediaEpisodesListChangedEvent>();
				const episodePatches$       = new Subject<MediaEpisodesItemsPatchedEvent>();
				const titleLanguage$        = new Subject<PreferredTitleLanguage>();
				const groupListListener     = vi.fn();
				const groupPatchListener    = vi.fn();
				const episodeListListener   = vi.fn();
				const episodePatchListener  = vi.fn();
				const titleLanguageListener = vi.fn();
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaListChanges",
				).mockReturnValue(groupList$);
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaItemsPatched",
				).mockReturnValue(groupPatches$);
				vi.spyOn(
					GroupExplorerFacade,
					"mediaEpisodesListChanges",
				).mockReturnValue(episodeList$);
				vi.spyOn(
					GroupExplorerFacade,
					"mediaEpisodesItemsPatched",
				).mockReturnValue(episodePatches$);
				vi.spyOn(
					UserConfigFacade,
					"preferredTitleLanguageChanges",
				).mockReturnValue(titleLanguage$);

				const subscriptions                                     = [
					groupMediaListChanges().subscribe(groupListListener),
					groupMediaItemsPatched().subscribe(groupPatchListener),
					mediaEpisodesListChanges().subscribe(episodeListListener),
					mediaEpisodesItemsPatched().subscribe(episodePatchListener),
					preferredTitleLanguageChanges().subscribe(titleLanguageListener),
				];
				const groupListEvent: GroupMediaListChangedEvent        = { affectedMediaIds: [ 7 ] };
				const groupPatchEvent: GroupMediaItemsPatchedEvent      = {
					patches: [
						{
							mediaId: 7,
							name:    "Patched media",
						},
					],
				};
				const episodeListEvent: MediaEpisodesListChangedEvent   = { mediaId: 7 };
				const episodePatchEvent: MediaEpisodesItemsPatchedEvent = {
					mediaId: 7,
					patches: [
						{
							episodeNumber: 1,
							isWatched:     true,
						},
					],
				};

				groupList$.next(groupListEvent);
				groupPatches$.next(groupPatchEvent);
				episodeList$.next(episodeListEvent);
				episodePatches$.next(episodePatchEvent);
				titleLanguage$.next("romaji");

				expect(groupListListener).toHaveBeenCalledWith(groupListEvent);
				expect(groupPatchListener).toHaveBeenCalledWith(groupPatchEvent);
				expect(episodeListListener).toHaveBeenCalledWith(episodeListEvent);
				expect(episodePatchListener).toHaveBeenCalledWith(episodePatchEvent);
				expect(titleLanguageListener).toHaveBeenCalledWith("romaji");

				subscriptions.forEach(subscription => subscription.unsubscribe());
			},
		);
	},
);
