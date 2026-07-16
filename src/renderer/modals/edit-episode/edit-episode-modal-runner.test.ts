import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	loadEpisodeImageGalleryTabs,
	pickEpisodeImageGalleryImage,
	resetEpisodeEdit,
	saveEpisodeEditDraft,
	uploadEpisodeThumbnailImage,
} from "./edit-episode-modal-runner";

const identity = {
	mediaId:       42,
	episodeNumber: 3,
};

describe(
	"edit episode modal runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists episode edits with thumbnail selection through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveEpisodeEdit",
				).mockResolvedValue({ success: true });

				await expect(saveEpisodeEditDraft(
					identity,
					{
						description: "Edited description",
						name:        "Edited episode",
					},
					{
						portrait:  "portrait-ignored",
						banner:    "banner-ignored",
						thumbnail: "thumbnail-user",
					},
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.saveEpisodeEdit).toHaveBeenCalledWith({
					mediaId:       42,
					episodeNumber: 3,
					description: "Edited description",
					name:          "Edited episode",
					selections:    [
						{
							role:         "thumbnail",
							candidateKey: "thumbnail-user",
						},
					],
				});
			},
		);

		it(
			"resets episode edits through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"resetEpisodeDetails",
				).mockResolvedValue({ success: true });

				await expect(resetEpisodeEdit(identity)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.resetEpisodeDetails).toHaveBeenCalledWith(identity);
			},
		);

		it(
			"loads and uploads episode thumbnail candidates through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"getEpisodeImageGallery",
				).mockResolvedValue({
					mediaId:       42,
					episodeNumber: 3,
					tabs:          [
						{
							role:       "thumbnail",
							title:      "Thumbnail",
							candidates: [],
						},
					],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"uploadEpisodeImageGalleryImage",
				).mockResolvedValue({
					success:      true,
					candidateKey: "thumbnail-user",
				});
				vi.spyOn(
					GroupExplorerFacade,
					"pickGroupImage",
				).mockResolvedValue({
					success:   true,
					imagePath: "/tmp/episode.png",
				});

				await expect(loadEpisodeImageGalleryTabs(identity)).resolves.toEqual([
					{
						role:       "thumbnail",
						title:      "Thumbnail",
						candidates: [],
					},
				]);
				await expect(uploadEpisodeThumbnailImage(
					identity,
					"/tmp/episode.png",
				)).resolves.toEqual({
					success:      true,
					candidateKey: "thumbnail-user",
				});
				await expect(pickEpisodeImageGalleryImage()).resolves.toEqual({
					success:   true,
					imagePath: "/tmp/episode.png",
				});

				expect(GroupExplorerFacade.getEpisodeImageGallery).toHaveBeenCalledWith(
					42,
					3,
				);
				expect(GroupExplorerFacade.uploadEpisodeImageGalleryImage).toHaveBeenCalledWith({
					mediaId:         42,
					episodeNumber:   3,
					role:            "thumbnail",
					sourceImagePath: "/tmp/episode.png",
				});
				expect(GroupExplorerFacade.pickGroupImage).toHaveBeenCalledTimes(1);
			},
		);
	},
);
