export const ROUTES = {
	ROOT:                        "/",
	DOWNLOAD_PRECACHED_ANIME_DB: "/download-precached-anime-db",
	POPULATE_ANIME_DB:           "/populate-anime-db",
	ERRORED_CONTENT:             {
		ROUTE_BASE: "errored-content",
		FULL_URL:   "/errored-content",
	},
	RELEASE_WATCH:               {
		ROUTE_BASE: "release-watch",
		FULL_URL:   "/release-watch",
	},
	GROUPS: {
		ROUTE_BASE:       "groups", // Group grid/list
		FULL_URL:         "/groups",
		IGNORED_FULL_URL: "/groups/ignored",
		FULL_ID:          "/app-layout/groups",
		GROUP:            {
			FULL_URL:         "/groups/$groupSource/$groupId/medias", // Full default route of the Group page
			DETAILS_FULL_URL: "/groups/$groupSource/$groupId/details",
			TIMELINE_FULL_URL: "/groups/$groupSource/$groupId/timeline",
			FULL_ID:          "/app-layout/groups/$groupSource/$groupId",
			ROUTE_BASE:       "$groupSource/$groupId", // Group layout base (tabs + outlet)
			MEDIAS:           "medias", // Group subroute for Media grid (default tab)
			DETAILS: "details",
			TIMELINE:         "timeline",
		},
		MEDIA:            {
			FULL_URL:            "/groups/$groupSource/$groupId/medias/$mediaId",
			DETAILS_FULL_URL:    "/groups/$groupSource/$groupId/medias/$mediaId/details",
			EPISODES_FULL_URL:   "/groups/$groupSource/$groupId/medias/$mediaId/episodes",
			CHARACTERS_FULL_URL: "/groups/$groupSource/$groupId/medias/$mediaId/characters",
			STAFF_FULL_URL:      "/groups/$groupSource/$groupId/medias/$mediaId/staff",
			DOWNLOAD_FULL_URL:   "/groups/$groupSource/$groupId/medias/$mediaId/download",
			FULL_ID:             "/app-layout/groups/$groupSource/$groupId/medias/$mediaId",
			FULL_LAYOUT_ID:      "/app-layout/groups/$groupSource/$groupId/medias/$mediaId",
			ROUTE_BASE:          "$groupSource/$groupId/medias/$mediaId", // Media layout base (tabs + outlet)
			DETAILS:             "details",
			EPISODES:            "episodes",
			CHARACTERS:          "characters",
			STAFF:               "staff",
			DOWNLOAD:            "download",
			EPISODE: "episodes/$episodeId", // Reserved for optional single-episode details.
		},
		STANDALONE_MEDIA: {
			FULL_URL:            "/groups/media/$mediaId",
			DETAILS_FULL_URL:    "/groups/media/$mediaId/details",
			EPISODES_FULL_URL:   "/groups/media/$mediaId/episodes",
			CHARACTERS_FULL_URL: "/groups/media/$mediaId/characters",
			STAFF_FULL_URL:      "/groups/media/$mediaId/staff",
			DOWNLOAD_FULL_URL:   "/groups/media/$mediaId/download",
			FULL_ID:             "/app-layout/groups/media/$mediaId",
			FULL_LAYOUT_ID:      "/app-layout/groups/media/$mediaId",
			ROUTE_BASE:          "media/$mediaId", // Standalone Media layout base (tabs + outlet)
			DETAILS:             "details",
			EPISODES:            "episodes",
			CHARACTERS:          "characters",
			STAFF:               "staff",
			DOWNLOAD:            "download",
			EPISODE: "episodes/$episodeId", // Reserved for optional single-episode details.
		},
		CHARACTER:        {
			FULL_URL:   "/groups/characters/$characterId",
			ROUTE_BASE: "characters/$characterId",
			FULL_ID:    "/app-layout/groups/characters/$characterId",
		},
		VOICE_ACTOR:      {
			FULL_URL:   "/groups/voice-actors/$voiceActorId",
			ROUTE_BASE: "voice-actors/$voiceActorId",
			FULL_ID:    "/app-layout/groups/voice-actors/$voiceActorId",
		},
		STAFF:            {
			FULL_URL:   "/groups/staff/$staffId",
			ROUTE_BASE: "staff/$staffId",
			FULL_ID:    "/app-layout/groups/staff/$staffId",
		},
	},
} as const;
