// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mediaEpisodesListChangedNext  = vi.fn();
const mediaEpisodesItemsPatchedNext = vi.fn();
const episodeOverrideGet            = vi.fn();
const episodeOverrideSave           = vi.fn();
const episodeOverrideDelete         = vi.fn();
const getEpisodeDetailsSnapshot = vi.fn();
const getSelectionSnapshot          = vi.fn();
const applyEpisodeSelections        = vi.fn();
const resetEpisodeSelections = vi.fn();
const logMainServiceError           = vi.fn();
const toasterError                  = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_MediaEpisodesListChanged:  {
			next: mediaEpisodesListChangedNext,
		},
		BUS_MediaEpisodesItemsPatched: {
			next: mediaEpisodesItemsPatchedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media: {
				getEpisodeDetailsSnapshot,
			},
		},
		UserDbFacade:  {
			overrides: {
				episode: {
					getMetadata:    episodeOverrideGet,
					saveMetadata:   episodeOverrideSave,
					deleteMetadata: episodeOverrideDelete,
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
	"../image-cache/image-gallery-service",
	() => ({
		ImageGalleryService: {
			getEpisodeSelectionSnapshot: getSelectionSnapshot,
			applyEpisodeSelections,
			resetEpisodeSelections,
		},
	}),
);

describe(
	"EpisodeEditService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			getSelectionSnapshot.mockReturnValue([
				{
					role:         "thumbnail",
					candidateKey: "provider:old-thumbnail",
				},
			]);
		});

		it(
			"restores the previous episode metadata override when thumbnail selection persistence fails",
			async () => {
				const previousOverride = {
					mediaId:       23,
					episodeNumber: 4,
					name:          "Previous episode",
					description:   "Previous description",
					thumbnail: "previous-thumbnail.jpg",
					aired:     "2025-01-01T00:00:00Z",
					updatedAt:     100,
				};
				episodeOverrideGet.mockReturnValue(previousOverride);
				applyEpisodeSelections
					.mockImplementationOnce(() => {
						throw new Error("selection failed");
					})
					.mockImplementationOnce(() => undefined);

				const { EpisodeEditService } = await import("./episode-edit-service");
				const result                 = EpisodeEditService.saveEdit({
					mediaId:       23,
					episodeNumber: 4,
					description: "New description",
					name:          "New episode",
					selections:    [
						{
							role:         "thumbnail",
							candidateKey: "upload:9",
						},
					],
				});

				expect(result.success).toBe(false);
				expect(episodeOverrideSave).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						mediaId:     23,
						name:        "New episode",
						description: "New description",
						thumbnail:   "previous-thumbnail.jpg",
						aired:       "2025-01-01T00:00:00Z",
					}),
				);
				expect(episodeOverrideSave).toHaveBeenNthCalledWith(
					2,
					previousOverride,
				);
				expect(applyEpisodeSelections).toHaveBeenLastCalledWith(
					23,
					4,
					[
						{
							role:         "thumbnail",
							candidateKey: "provider:old-thumbnail",
						},
					],
				);
				expect(mediaEpisodesListChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"resets episode details from a compact AnimeDB episode snapshot",
			async () => {
				getEpisodeDetailsSnapshot.mockReturnValue({
					mediaId:       23,
					episodeNumber: 4,
					name:          "Official episode",
					description:   undefined,
					thumbnail:     "https://img.example.test/episode.jpg",
					aired:         "2026-07-05T10:00:00Z",
					duration:      24,
					score:         8.2,
					filler:        false,
					recap:         "Official synopsis",
				});

				const { EpisodeEditService } = await import("./episode-edit-service");
				const result                 = EpisodeEditService.resetDetails({
					mediaId:       23,
					episodeNumber: 4,
				});

				expect(result).toEqual({ success: true });
				expect(episodeOverrideDelete).toHaveBeenCalledWith(
					23,
					4,
				);
				expect(resetEpisodeSelections).toHaveBeenCalledWith(
					23,
					4,
				);
				expect(getEpisodeDetailsSnapshot).toHaveBeenCalledWith(
					23,
					4,
				);
				expect(mediaEpisodesItemsPatchedNext).toHaveBeenCalledWith({
					mediaId: 23,
					patches: [
						{
							episodeNumber: 4,
							name:          "Official episode",
							description:   undefined,
							thumbnail:     "https://img.example.test/episode.jpg",
							aired:         "2026-07-05T10:00:00Z",
							duration:      24,
							score:         8.2,
							filler:        false,
							recap:         "Official synopsis",
						},
					],
				});
				expect(mediaEpisodesListChangedNext).toHaveBeenCalledWith({ mediaId: 23 });
			},
		);

		it(
			"restores episode metadata and thumbnail selection when reset selection persistence fails",
			async () => {
				const previousOverride = {
					mediaId:       23,
					episodeNumber: 4,
					name:          "Custom episode",
					description:   "Custom description",
					thumbnail:     "custom-thumbnail.jpg",
					aired:         null,
					updatedAt:     200,
				};
				getEpisodeDetailsSnapshot.mockReturnValue({
					mediaId:       23,
					episodeNumber: 4,
					name:          "Official episode",
				});
				episodeOverrideGet.mockReturnValue(previousOverride);
				resetEpisodeSelections.mockImplementationOnce(() => {
					throw new Error("selection reset failed");
				});

				const { EpisodeEditService } = await import("./episode-edit-service");
				const result                 = EpisodeEditService.resetDetails({
					mediaId:       23,
					episodeNumber: 4,
				});

				expect(result.success).toBe(false);
				expect(episodeOverrideDelete).toHaveBeenCalledWith(
					23,
					4,
				);
				expect(episodeOverrideSave).toHaveBeenCalledWith(previousOverride);
				expect(applyEpisodeSelections).toHaveBeenCalledWith(
					23,
					4,
					[
						{
							role:         "thumbnail",
							candidateKey: "provider:old-thumbnail",
						},
					],
				);
				expect(mediaEpisodesItemsPatchedNext).not.toHaveBeenCalled();
				expect(mediaEpisodesListChangedNext).not.toHaveBeenCalled();
			},
		);
	},
);
