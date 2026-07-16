// @vitest-environment jsdom

import type {
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
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
} from "../../../facades";
import {
	libraryGroupListChanges,
	libraryGroupMediaItemsPatched,
	libraryGroupMediaListChanges,
	libraryPreferredTitleLanguageChanges,
} from "./library-wall-invalidation-runner";

describe(
	"library-wall-invalidation-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"exposes library wall invalidation streams from the facades",
			() => {
				const groupList$              = new Subject<GroupListChangedEvent>();
				const groupMediaList$         = new Subject<GroupMediaListChangedEvent>();
				const groupMediaPatch$        = new Subject<GroupMediaItemsPatchedEvent>();
				const titleLanguage$          = new Subject<PreferredTitleLanguage>();
				const groupListListener       = vi.fn();
				const groupMediaListListener  = vi.fn();
				const groupMediaPatchListener = vi.fn();
				const titleLanguageListener   = vi.fn();
				vi.spyOn(
					GroupExplorerFacade,
					"groupListChanges",
				).mockReturnValue(groupList$);
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaListChanges",
				).mockReturnValue(groupMediaList$);
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaItemsPatched",
				).mockReturnValue(groupMediaPatch$);
				vi.spyOn(
					UserConfigFacade,
					"preferredTitleLanguageChanges",
				).mockReturnValue(titleLanguage$);

				const subscriptions                                     = [
					libraryGroupListChanges().subscribe(groupListListener),
					libraryGroupMediaListChanges().subscribe(groupMediaListListener),
					libraryGroupMediaItemsPatched().subscribe(groupMediaPatchListener),
					libraryPreferredTitleLanguageChanges().subscribe(titleLanguageListener),
				];
				const groupListEvent: GroupListChangedEvent             = {};
				const groupMediaListEvent: GroupMediaListChangedEvent   = { affectedMediaIds: [ 7 ] };
				const groupMediaPatchEvent: GroupMediaItemsPatchedEvent = { patches: [ { mediaId: 7 } ] };

				groupList$.next(groupListEvent);
				groupMediaList$.next(groupMediaListEvent);
				groupMediaPatch$.next(groupMediaPatchEvent);
				titleLanguage$.next("romaji");

				expect(groupListListener).toHaveBeenCalledWith(groupListEvent);
				expect(groupMediaListListener).toHaveBeenCalledWith(groupMediaListEvent);
				expect(groupMediaPatchListener).toHaveBeenCalledWith(groupMediaPatchEvent);
				expect(titleLanguageListener).toHaveBeenCalledWith("romaji");
				expect(GroupExplorerFacade.groupListChanges).toHaveBeenCalledTimes(1);
				expect(GroupExplorerFacade.groupMediaListChanges).toHaveBeenCalledTimes(1);
				expect(GroupExplorerFacade.groupMediaItemsPatched).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.preferredTitleLanguageChanges).toHaveBeenCalledTimes(1);

				subscriptions.forEach(subscription => subscription.unsubscribe());
			},
		);
	},
);
