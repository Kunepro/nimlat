import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	GroupAssignmentsFacade,
	GroupExplorerFacade,
} from "../../../facades";
import {
	persistGroupIntegrationStatus,
	persistGroupMediaIntegrationStatus,
	persistGroupMediaWatchState,
	refreshGroupMediaItem,
	removeGroupMediaItem,
	restoreGroupMediaItem,
} from "./group-media-mutations-runner";

describe(
	"group media mutations runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists group and media integration statuses through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupIntegrationStatus",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistGroupIntegrationStatus(
					{
						source:  "user",
						groupId: 4,
					},
					"tracked",
				)).resolves.toEqual({ success: true });
				await expect(persistGroupMediaIntegrationStatus(
					9,
					"ignored",
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setGroupIntegrationStatus).toHaveBeenCalledWith({
					group:             {
						source:  "user",
						groupId: 4,
					},
					integrationStatus: "tracked",
				});
				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           9,
					integrationStatus: "ignored",
				});
			},
		);

		it(
			"persists watched state and refresh commands through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 9 ],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"refreshMedia",
				).mockResolvedValue({ success: true });

				await expect(persistGroupMediaWatchState(
					9,
					true,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [ 9 ],
				});
				await expect(refreshGroupMediaItem(9)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setMediaWatchState).toHaveBeenCalledWith({
					mediaIds:  [ 9 ],
					isWatched: true,
				});
				expect(GroupExplorerFacade.refreshMedia).toHaveBeenCalledWith(9);
			},
		);

		it(
			"persists remove and restore commands through the group assignments facade",
			async () => {
				vi.spyOn(
					GroupAssignmentsFacade,
					"removeMediaManual",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupAssignmentsFacade,
					"assignMediasManual",
				).mockResolvedValue({ success: true });

				await expect(removeGroupMediaItem(
					4,
					9,
				)).resolves.toEqual({ success: true });
				await expect(restoreGroupMediaItem(
					4,
					9,
				)).resolves.toEqual({ success: true });

				expect(GroupAssignmentsFacade.removeMediaManual).toHaveBeenCalledWith({
					groupId: 4,
					mediaId: 9,
				});
				expect(GroupAssignmentsFacade.assignMediasManual).toHaveBeenCalledWith({
					groupId:  4,
					mediaIds: [ 9 ],
				});
			},
		);
	},
);
