import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	deleteMediaImageGalleryImage,
	loadMediaImageGalleryTabs,
	pickMediaImageGalleryImage,
	resetMediaEdit,
	saveMediaEditDraft,
	uploadMediaImageGalleryImage,
} from "./edit-media-modal-runner";

describe(
	"edit media modal runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists media title edits with image selections through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveMediaEdit",
				).mockResolvedValue({ success: true });

				await expect(saveMediaEditDraft(
					42,
					{
						name:        "Edited title",
						description: "Edited description",
					},
					{
						portrait:  "portrait-user",
						banner:    "banner-user",
						thumbnail: "thumbnail-derived",
					},
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.saveMediaEdit).toHaveBeenCalledWith({
					mediaId:     42,
					name:        "Edited title",
					description: "Edited description",
					selections:  [
						{
							role:         "portrait",
							candidateKey: "portrait-user",
						},
						{
							role:         "banner",
							candidateKey: "banner-user",
						},
					],
				});
			},
		);

		it(
			"resets media edits through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"resetMediaDetails",
				).mockResolvedValue({ success: true });

				await expect(resetMediaEdit(42)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.resetMediaDetails).toHaveBeenCalledWith({ mediaId: 42 });
			},
		);

		it(
			"loads and mutates media image gallery candidates through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"getMediaImageGallery",
				).mockResolvedValue({
					mediaId: 42,
					tabs:    [
						{
							role:       "portrait",
							title:      "Portrait",
							candidates: [],
						},
					],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"uploadMediaImageGalleryImage",
				).mockResolvedValue({
					success:      true,
					candidateKey: "portrait-user",
				});
				vi.spyOn(
					GroupExplorerFacade,
					"deleteMediaImageGalleryImage",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"pickGroupImage",
				).mockResolvedValue({
					success:   true,
					imagePath: "/tmp/image.png",
				});

				await expect(loadMediaImageGalleryTabs(42)).resolves.toEqual([
					{
						role:       "portrait",
						title:      "Portrait",
						candidates: [],
					},
				]);
				await expect(uploadMediaImageGalleryImage(
					42,
					"portrait",
					"/tmp/image.png",
				)).resolves.toEqual({
					success:      true,
					candidateKey: "portrait-user",
				});
				await expect(deleteMediaImageGalleryImage(
					42,
					"portrait-user",
				)).resolves.toEqual({ success: true });
				await expect(pickMediaImageGalleryImage()).resolves.toEqual({
					success:   true,
					imagePath: "/tmp/image.png",
				});

				expect(GroupExplorerFacade.getMediaImageGallery).toHaveBeenCalledWith(42);
				expect(GroupExplorerFacade.uploadMediaImageGalleryImage).toHaveBeenCalledWith({
					mediaId:         42,
					role:            "portrait",
					sourceImagePath: "/tmp/image.png",
				});
				expect(GroupExplorerFacade.deleteMediaImageGalleryImage).toHaveBeenCalledWith({
					mediaId:      42,
					candidateKey: "portrait-user",
				});
				expect(GroupExplorerFacade.pickGroupImage).toHaveBeenCalledTimes(1);
			},
		);
	},
);
