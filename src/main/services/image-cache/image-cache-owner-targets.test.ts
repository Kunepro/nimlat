// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_EPISODE_IMAGE_CACHE: "/cache/episodes",
		PATH_GROUP_IMAGE_CACHE:   "/cache/groups",
		PATH_MEDIA_IMAGE_CACHE:   "/cache/medias",
	}),
);

describe(
	"image-cache-owner-targets",
	() => {
		it(
			"creates media, group, episode, and gallery cache targets",
			async () => {
				const {
								createEpisodeImageTarget,
								createGalleryCandidateImageTarget,
								createGroupImageTarget,
								createMediaImageTarget,
							} = await import("./image-cache-owner-targets");

				expect(createMediaImageTarget(
					123,
					"primary",
				)).toEqual({
					ownerKind:        "media",
					ownerId:          "123",
					imageRole:        "primary",
					targetFolderPath: "/cache/medias",
					displayTarget:    {
						kind:    "media",
						mediaId: 123,
					},
				});
				expect(createGroupImageTarget(
					{
						source:  "user",
						groupId: 77,
					},
					"banner",
				)).toEqual({
					ownerKind:        "user_group",
					ownerId:          "77",
					imageRole:        "banner",
					targetFolderPath: "/cache/groups",
					displayTarget:    {
						kind:  "group",
						group: {
							source:  "user",
							groupId: 77,
						},
					},
				});
				expect(createEpisodeImageTarget(
					123,
					4,
				)).toEqual(expect.objectContaining({
					ownerKind:        "episode",
					ownerId:          "123:4",
					imageRole:        "thumbnail",
					targetFolderPath: "/cache/episodes",
				}));
				expect(createGalleryCandidateImageTarget(
					"official_group",
					"55",
					"primary",
				)).toEqual(expect.objectContaining({
					ownerKind:        "official_group",
					ownerId:          "55",
					targetFolderPath: "/cache/groups",
					displayTarget:    { kind: "none" },
				}));
			},
		);
	},
);
