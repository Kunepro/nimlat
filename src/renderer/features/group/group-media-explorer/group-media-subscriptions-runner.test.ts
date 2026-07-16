// @vitest-environment jsdom

import type {
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
	groupMediaItemsPatched,
	groupMediaListChanges,
	groupMediaPreferredTitleLanguageChanges,
} from "./group-media-subscriptions-runner";

describe(
	"group-media-subscriptions-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"exposes group-media route invalidation streams from the facades",
			() => {
				const list$                 = new Subject<GroupMediaListChangedEvent>();
				const patches$              = new Subject<GroupMediaItemsPatchedEvent>();
				const titleLanguage$        = new Subject<PreferredTitleLanguage>();
				const listListener          = vi.fn();
				const patchesListener       = vi.fn();
				const titleLanguageListener = vi.fn();
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaListChanges",
				).mockReturnValue(list$);
				vi.spyOn(
					GroupExplorerFacade,
					"groupMediaItemsPatched",
				).mockReturnValue(patches$);
				vi.spyOn(
					UserConfigFacade,
					"preferredTitleLanguageChanges",
				).mockReturnValue(titleLanguage$);

				const subscriptions                           = [
					groupMediaListChanges().subscribe(listListener),
					groupMediaItemsPatched().subscribe(patchesListener),
					groupMediaPreferredTitleLanguageChanges().subscribe(titleLanguageListener),
				];
				const group                                   = {
					source:  "user" as const,
					groupId: 3,
				};
				const listEvent: GroupMediaListChangedEvent   = {
					groups:           [ group ],
					affectedMediaIds: [ 9 ],
				};
				const patchEvent: GroupMediaItemsPatchedEvent = {
					group,
					patches: [ { mediaId: 9 } ],
				};

				list$.next(listEvent);
				patches$.next(patchEvent);
				titleLanguage$.next("romaji");

				expect(listListener).toHaveBeenCalledWith(listEvent);
				expect(patchesListener).toHaveBeenCalledWith(patchEvent);
				expect(titleLanguageListener).toHaveBeenCalledWith("romaji");
				expect(GroupExplorerFacade.groupMediaListChanges).toHaveBeenCalledTimes(1);
				expect(GroupExplorerFacade.groupMediaItemsPatched).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.preferredTitleLanguageChanges).toHaveBeenCalledTimes(1);

				subscriptions.forEach(subscription => subscription.unsubscribe());
			},
		);
	},
);
