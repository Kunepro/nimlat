// @vitest-environment jsdom

import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	getCharacterInspection,
	getStaffInspection,
	getVoiceActorInspection,
} from "./people-inspection-runner";

describe(
	"people-inspection-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads people inspections through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"getCharacterInspection",
				).mockResolvedValue(null);
				vi.spyOn(
					GroupExplorerFacade,
					"getStaffInspection",
				).mockResolvedValue(null);
				vi.spyOn(
					GroupExplorerFacade,
					"getVoiceActorInspection",
				).mockResolvedValue(null);

				await expect(getCharacterInspection(1)).resolves.toBeNull();
				await expect(getStaffInspection(2)).resolves.toBeNull();
				await expect(getVoiceActorInspection(3)).resolves.toBeNull();

				expect(GroupExplorerFacade.getCharacterInspection).toHaveBeenCalledWith(1);
				expect(GroupExplorerFacade.getStaffInspection).toHaveBeenCalledWith(2);
				expect(GroupExplorerFacade.getVoiceActorInspection).toHaveBeenCalledWith(3);
			},
		);
	},
);
