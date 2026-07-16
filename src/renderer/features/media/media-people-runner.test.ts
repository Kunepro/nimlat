// @vitest-environment jsdom

import type {
	MediaCharacterListItem,
	MediaStaffListItem,
} from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	listMediaCharacters,
	listMediaStaff,
} from "./media-people-runner";

describe(
	"media-people-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads media characters and staff through the group explorer facade",
			async () => {
				const characters: MediaCharacterListItem[] = [];
				const staff: MediaStaffListItem[]          = [];
				vi.spyOn(
					GroupExplorerFacade,
					"listMediaCharacters",
				).mockResolvedValue(characters);
				vi.spyOn(
					GroupExplorerFacade,
					"listMediaStaff",
				).mockResolvedValue(staff);

				await expect(listMediaCharacters(7)).resolves.toBe(characters);
				await expect(listMediaStaff(7)).resolves.toBe(staff);

				expect(GroupExplorerFacade.listMediaCharacters).toHaveBeenCalledWith(7);
				expect(GroupExplorerFacade.listMediaStaff).toHaveBeenCalledWith(7);
			},
		);
	},
);
