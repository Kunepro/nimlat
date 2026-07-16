import {
	describe,
	expect,
	it,
} from "vitest";
import {
	mapGroupMediaCardToMediaWallItem,
	mapLibraryDisplayItemToMediaWallItem,
} from "./media-wall-item-adapters";

describe(
	"media-wall item adapters",
	() => {
		it(
			"maps mixed library items to the common media-wall shape",
			() => {
				expect(mapLibraryDisplayItemToMediaWallItem(
					{
						key:                "group:official:10",
						kind:               "group",
						name:               "Library Group",
						displayImageUrl:    "group.jpg",
						isAdult: true,
						isWatched:          true,
						integrationPercent: 65,
						integrationStatus:  "downloading",
						lastRefresh:        new Date(0).toISOString(),
						group:              {
							source:  "official",
							groupId: 10,
						},
						mediasCount:        3,
					},
					"library",
				)).toEqual({
					id:              "group:official:10",
					title:           "Library Group",
					subtitle:        undefined,
					description:     undefined,
					thumbnailUrl:    "group.jpg",
					progressPercent: 65,
					integrationStatus: "downloading",
					isAdult:         true,
					isWatched:       true,
					mediaCount:      3,
					kind:            "library",
				});
			},
		);

		it(
			"maps group media cards with issue badges",
			() => {
				expect(mapGroupMediaCardToMediaWallItem({
					mediaId:            20,
					name:               "Media Card",
					format:  "TV_SERIE",
					displayImageUrl:    "media.jpg",
					integrationPercent: 100,
					integrationStatus:  "integrated",
					isAdult: true,
					isWatched:          true,
					hasPlaybackIssue:   true,
					lastRefresh:        new Date(0).toISOString(),
					hasHydrationIssue:  true,
					isFilm:             false,
				})).toEqual({
					id:              "media:20",
					title:           "Media Card",
					subtitle:        "TV SERIE",
					description:     undefined,
					thumbnailUrl:    "media.jpg",
					progressPercent: 100,
					integrationStatus: "integrated",
					badges:          [
						"TV SERIE",
						"Playback issue",
						"Hydration issue",
					],
					isAdult:         true,
					isWatched:       true,
					kind:            "group-media",
				});
			},
		);

		it(
			"passes provider thumbnails through so the Pixi loader can bridge them",
			() => {
				expect(mapGroupMediaCardToMediaWallItem({
					mediaId:            21,
					name:               "Remote Media Card",
					format:             "TV",
					imageUrl:           "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg",
					displayImageUrl:    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg",
					displayImageSource: "remote",
					integrationPercent: 100,
					integrationStatus:  "integrated",
					hasPlaybackIssue:   false,
					lastRefresh:        new Date(0).toISOString(),
					hasHydrationIssue:  false,
					isFilm:             false,
				}).thumbnailUrl).toBe("https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg");
			},
		);

		it(
			"passes cached local thumbnails through to Pixi",
			() => {
				expect(mapGroupMediaCardToMediaWallItem({
					mediaId:            22,
					name:               "Cached Media Card",
					format:             "TV",
					imageUrl:           "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg",
					displayImageUrl:    "C:\\Users\\Dawn\\AppData\\Roaming\\nimlat\\cache\\example.jpg",
					displayImageSource: "cached_local",
					integrationPercent: 100,
					integrationStatus:  "integrated",
					hasPlaybackIssue:   false,
					lastRefresh:        new Date(0).toISOString(),
					hasHydrationIssue:  false,
					isFilm:             false,
				}).thumbnailUrl).toBe("C:\\Users\\Dawn\\AppData\\Roaming\\nimlat\\cache\\example.jpg");
			},
		);

		it(
			"keeps media formats uppercase for canvas card labels",
			() => {
				expect(mapLibraryDisplayItemToMediaWallItem({
					key:         "media:23",
					kind:        "media",
					name:        "Library Movie Media Card",
					format:      "Movie",
					lastRefresh: new Date(0).toISOString(),
				}).subtitle).toBe("MOVIE");
				expect(mapGroupMediaCardToMediaWallItem({
					mediaId:            23,
					name:               "Movie Media Card",
					format:             "Movie",
					integrationPercent: 0,
					integrationStatus:  null,
					hasPlaybackIssue:   false,
					lastRefresh:        new Date(0).toISOString(),
					hasHydrationIssue:  false,
					isFilm:             true,
				}).subtitle).toBe("MOVIE");
			},
		);
	},
);
