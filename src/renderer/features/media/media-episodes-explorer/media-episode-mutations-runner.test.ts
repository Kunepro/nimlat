import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../../facades";
import {
	persistEpisodeIntegrationStatus,
	persistEpisodeIntegrationStatuses,
	persistEpisodePlaybackIssueState,
	persistEpisodeWatchState,
	persistEpisodeWatchStates,
} from "./media-episode-mutations-runner";

describe(
	"media episode mutations runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists episode integration status commands through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeIntegrationStatus",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeIntegrationStatuses",
				).mockResolvedValue({ success: true });

				await expect(persistEpisodeIntegrationStatus(
					7,
					3,
					"tracked",
				)).resolves.toEqual({ success: true });
				await expect(persistEpisodeIntegrationStatuses(
					7,
					[
						1,
						2,
					],
					"downloaded",
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setEpisodeIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           7,
					episodeNumber:     3,
					integrationStatus: "tracked",
				});
				expect(GroupExplorerFacade.setEpisodeIntegrationStatuses).toHaveBeenCalledWith({
					mediaId:           7,
					episodeNumbers:    [
						1,
						2,
					],
					integrationStatus: "downloaded",
				});
			},
		);

		it(
			"persists episode watched state commands through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 7 ],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeWatchStates",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 7 ],
				});

				await expect(persistEpisodeWatchState(
					7,
					3,
					true,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [ 7 ],
				});
				await expect(persistEpisodeWatchStates(
					7,
					[
						1,
						2,
					],
					false,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [ 7 ],
				});

				expect(GroupExplorerFacade.setEpisodeWatchState).toHaveBeenCalledWith({
					mediaId:       7,
					episodeNumber: 3,
					isWatched:     true,
				});
				expect(GroupExplorerFacade.setEpisodeWatchStates).toHaveBeenCalledWith({
					mediaId:        7,
					episodeNumbers: [
						1,
						2,
					],
					isWatched:      false,
				});
			},
		);

		it(
			"persists episode playback issue saves through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveEpisodeIntegrationState",
				).mockResolvedValue({ success: true });

				await expect(persistEpisodePlaybackIssueState(
					{
						mediaId:       7,
						episodeNumber: 3,
						name:          "Episode 3",
						isWatched:     false,
					},
					{
						integrationStatus:    "tracked",
						playbackIssueNote:    "audio drifts after OP",
						playbackIssueMoments: [],
					},
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.saveEpisodeIntegrationState).toHaveBeenCalledWith({
					mediaId:              7,
					episodeNumber:        3,
					integrationStatus:    "tracked",
					playbackIssueNote:    "audio drifts after OP",
					playbackIssueMoments: [],
				});
			},
		);
	},
);
