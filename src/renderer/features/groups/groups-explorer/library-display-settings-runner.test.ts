// @vitest-environment jsdom

import type {
	LibraryDisplayFilters,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
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
	getLibraryAdultContentStatus,
	getLibraryDisplayFilters,
	libraryAdultContentStatusChanges,
	listLibraryFilterOptions,
	saveLibraryDisplayFilters,
} from "./library-display-settings-runner";

const filters: LibraryDisplayFilters = {
	adultFilter: "mixed",
	displayMode: "groups",
	genreNames:  [],
	tagNames:    [],
};

const options: LibraryFilterOptions = {
	genreNames: [ "Action" ],
	tagNames:   [ "Found Family" ],
};

describe(
	"library-display-settings-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"delegates library display reads, writes, and events to facades",
			async () => {
				const adultChanges$ = new Subject<boolean>();
				const listener      = vi.fn();
				vi.spyOn(
					UserConfigFacade,
					"getAdultContentStatus",
				).mockResolvedValue(true);
				vi.spyOn(
					UserConfigFacade,
					"getLibraryDisplayFilters",
				).mockResolvedValue(filters);
				vi.spyOn(
					GroupExplorerFacade,
					"listLibraryFilterOptions",
				).mockResolvedValue(options);
				vi.spyOn(
					UserConfigFacade,
					"setLibraryDisplayFilters",
				).mockResolvedValue(undefined);
				vi.spyOn(
					UserConfigFacade,
					"adultContentStatusChanges",
				).mockReturnValue(adultChanges$);

				await expect(getLibraryAdultContentStatus()).resolves.toBe(true);
				await expect(getLibraryDisplayFilters()).resolves.toBe(filters);
				await expect(listLibraryFilterOptions()).resolves.toBe(options);
				await expect(saveLibraryDisplayFilters(filters)).resolves.toBeUndefined();
				const subscription = libraryAdultContentStatusChanges().subscribe(listener);

				adultChanges$.next(false);

				expect(UserConfigFacade.getAdultContentStatus).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getLibraryDisplayFilters).toHaveBeenCalledTimes(1);
				expect(GroupExplorerFacade.listLibraryFilterOptions).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.setLibraryDisplayFilters).toHaveBeenCalledWith(filters);
				expect(listener).toHaveBeenCalledWith(false);

				subscription.unsubscribe();
			},
		);
	},
);
