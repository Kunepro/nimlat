import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	loadGroupImageGalleryTabs,
	pickGroupImageGalleryImage,
	saveGroupEditDraft,
	uploadGroupImageGalleryImage,
} from "./edit-group-modal-runner";

const group = {
	source:  "user" as const,
	groupId: 4,
};

describe(
	"edit group modal runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists group edits with image selections through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveGroupEdit",
				).mockResolvedValue({ success: true });

				await expect(saveGroupEditDraft(
					group,
					{
						name:        "Edited group",
						description: "Edited description",
					},
					{
						portrait:  "portrait-user",
						banner:    "banner-user",
						thumbnail: "thumbnail-derived",
					},
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.saveGroupEdit).toHaveBeenCalledWith({
					group,
					name:        "Edited group",
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
			"loads and uploads group gallery candidates through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"getGroupImageGallery",
				).mockResolvedValue({
					group,
					tabs: [
						{
							role:       "banner",
							title:      "Banner",
							candidates: [],
						},
					],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"uploadGroupImageGalleryImage",
				).mockResolvedValue({
					success:      true,
					candidateKey: "banner-user",
				});
				vi.spyOn(
					GroupExplorerFacade,
					"pickGroupImage",
				).mockResolvedValue({
					success:   true,
					imagePath: "/tmp/group.png",
				});

				await expect(loadGroupImageGalleryTabs(group)).resolves.toEqual([
					{
						role:       "banner",
						title:      "Banner",
						candidates: [],
					},
				]);
				await expect(uploadGroupImageGalleryImage(
					group,
					"banner",
					"/tmp/group.png",
				)).resolves.toEqual({
					success:      true,
					candidateKey: "banner-user",
				});
				await expect(pickGroupImageGalleryImage()).resolves.toEqual({
					success:   true,
					imagePath: "/tmp/group.png",
				});

				expect(GroupExplorerFacade.getGroupImageGallery).toHaveBeenCalledWith(group);
				expect(GroupExplorerFacade.uploadGroupImageGalleryImage).toHaveBeenCalledWith({
					group,
					role:            "banner",
					sourceImagePath: "/tmp/group.png",
				});
				expect(GroupExplorerFacade.pickGroupImage).toHaveBeenCalledTimes(1);
			},
		);
	},
);
