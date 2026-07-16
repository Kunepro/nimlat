// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const episodeSetStatus          = vi.fn();
const episodeSaveState          = vi.fn();
const mediaSetStatus            = vi.fn();
const mediaSaveStateWithMoments = vi.fn();
const groupSetStatusForGroupRef = vi.fn();
const handleIntegrationCascade  = vi.fn();
const logMainServiceError       = vi.fn();
const toasterError              = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			integration: {
				episode: {
					setStatus: episodeSetStatus,
					saveState: episodeSaveState,
				},
				media:   {
					setStatus:            mediaSetStatus,
					saveStateWithMoments: mediaSaveStateWithMoments,
				},
				group:   {
					setStatusForGroupRef: groupSetStatusForGroupRef,
				},
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

vi.mock(
	"../../utils/toaster",
	() => ({
		Toaster: {
			error: toasterError,
		},
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: {
			handleIntegrationCascade,
		},
	}),
);

describe(
	"IntegrationStatusService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"forwards episode status changes to the DB layer and coordinator",
			async () => {
				episodeSetStatus.mockReturnValue({
					affectedMediaIds: [ 5 ],
					affectedGroups: [
						{
							source:  "official",
							groupId: 8,
						},
					],
				});

				const { IntegrationStatusService } = await import("./integration-status-service");
				const result                       = IntegrationStatusService.setEpisodeStatus({
					mediaId:           5,
					episodeNumber:     2,
					integrationStatus: "tracked",
				});

				expect(result).toEqual({ success: true });
				expect(episodeSetStatus).toHaveBeenCalledWith(
					5,
					2,
					"tracked",
				);
				expect(handleIntegrationCascade).toHaveBeenCalledWith({
					affectedMediaIds: [ 5 ],
					affectedGroups: [
						{
							source:  "official",
							groupId: 8,
						},
					],
				});
			},
		);

		it(
			"maps media playback state flags and moments before saving",
			async () => {
				mediaSaveStateWithMoments.mockReturnValue({
					affectedMediaIds: [ 9 ],
					affectedGroups: [
						{
							source:  "user",
							groupId: 10,
						},
					],
				});
				const nowSpy = vi.spyOn(
					Date,
					"now",
				).mockReturnValue(123456789);

				const { IntegrationStatusService } = await import("./integration-status-service");
				const result                       = IntegrationStatusService.saveMediaState({
					mediaId:              9,
					integrationStatus:    "downloaded",
					playbackIssueNote:    "video artifact",
					hasDubIssue:          false,
					hasSubIssue:          true,
					hasEncodingIssue:     false,
					hasAudioIssue:        false,
					hasVideoIssue:        true,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "video",
							timeSeconds:           77,
							note:                  "artifact",
						},
					],
				});

				expect(result).toEqual({ success: true });
				expect(mediaSaveStateWithMoments).toHaveBeenCalledWith(
					{
						mediaId:           9,
						integrationStatus: "downloaded",
						playbackIssueNote: "video artifact",
						hasDubIssue:       0,
						hasSubIssue:       1,
						hasEncodingIssue:  0,
						hasAudioIssue:     0,
						hasVideoIssue:     1,
						updatedAt:         123456789,
					},
					[
						{
							mediaId:               9,
							playbackIssueCategory: "video",
							timeSeconds:           77,
							note:                  "artifact",
							updatedAt:             123456789,
						},
					],
				);
				expect(handleIntegrationCascade).toHaveBeenCalled();
				nowSpy.mockRestore();
			},
		);

		it(
			"returns a failure result and logs when group status persistence fails",
			async () => {
				groupSetStatusForGroupRef.mockImplementation(() => {
					throw new Error("group write failed");
				});

				const { IntegrationStatusService } = await import("./integration-status-service");
				const result                       = IntegrationStatusService.setGroupStatus({
					group: {
						source:  "official",
						groupId: 4,
					},
					integrationStatus: "integrated",
				});

				expect(result).toEqual({
					success: false,
					error:   "group write failed",
				});
				expect(logMainServiceError).toHaveBeenCalledWith(
					"integration-status.set-group",
					expect.any(Error),
					{
						group: {
							source:  "official",
							groupId: 4,
						},
						integrationStatus: "integrated",
					},
				);
				expect(toasterError).toHaveBeenCalledWith("Failed to update group integration status.");
				expect(handleIntegrationCascade).not.toHaveBeenCalled();
			},
		);
	},
);
