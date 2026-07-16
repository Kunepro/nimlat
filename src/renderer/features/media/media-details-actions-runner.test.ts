import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	persistIgnoredMediaIntegrationStatus,
	persistMediaWatchedState,
	refreshMediaMetadata,
} from "./media-details-actions-runner";

describe(
	"media details actions runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists ignored media integration status through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistIgnoredMediaIntegrationStatus(42)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           42,
					integrationStatus: "ignored",
				});
			},
		);

		it(
			"delegates metadata refresh to the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"refreshMedia",
				).mockResolvedValue({ success: true });

				await expect(refreshMediaMetadata(7)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.refreshMedia).toHaveBeenCalledWith(7);
			},
		);

		it(
			"persists watched state through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 11 ],
				});

				await expect(persistMediaWatchedState(
					11,
					true,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [ 11 ],
				});

				expect(GroupExplorerFacade.setMediaWatchState).toHaveBeenCalledWith({
					mediaIds:  [ 11 ],
					isWatched: true,
				});
			},
		);
	},
);
