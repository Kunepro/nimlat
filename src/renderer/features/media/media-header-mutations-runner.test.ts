import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	persistMediaHeaderPlaybackIssueState,
	persistMediaHeaderTrackingStatus,
} from "./media-header-mutations-runner";

describe(
	"media header mutations runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists header tracking status through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistMediaHeaderTrackingStatus(
					42,
					"tracked",
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           42,
					integrationStatus: "tracked",
				});
			},
		);

		it(
			"persists media-level playback issue state through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveMediaIntegrationState",
				).mockResolvedValue({ success: true });
				const payload = {
					integrationStatus:    null,
					playbackIssueNote:    "audio drifts after OP",
					hasAudioIssue:        true,
					hasDubIssue:          false,
					hasSubIssue:          true,
					hasEncodingIssue:     false,
					hasVideoIssue:        false,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "audio" as const,
							timeSeconds:           125,
						},
					],
				};

				await expect(persistMediaHeaderPlaybackIssueState(
					7,
					payload,
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.saveMediaIntegrationState).toHaveBeenCalledWith({
					...payload,
					mediaId: 7,
				});
			},
		);
	},
);
