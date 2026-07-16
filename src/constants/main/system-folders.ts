import { app } from "electron";
import { join } from "path";

app.setPath(
	"userData",
	join(
		app.getPath("appData"),
		"Nimlat",
	),
);

const PATH_USER_DATA   = app.getPath("userData");
export const PATH_USER_DB             = join(
	PATH_USER_DATA,
	"data",
	"user_data.db",
);
export const PATH_ANIME_DB            = join(
	PATH_USER_DATA,
	"data",
	"anime_data.db",
);
export const PATH_IMAGE_DB            = join(
	PATH_USER_DATA,
	"data",
	"image_data.db",
);
export const PATH_PRELOAD_JS          = join(
	__dirname,
	"preload.js",
);
export const PATH_ICON                = join(
	__dirname,
	"icon.png",
);
export const PATH_INDEX_HTML          = join(
	__dirname,
	"index.html",
);
export const PATH_DATA                = join(
	PATH_USER_DATA,
	"data",
);
export const PATH_USER_IMAGES         = join(
	PATH_DATA,
	"user-images",
);
export const PATH_GROUP_USER_IMAGES   = join(
	PATH_USER_IMAGES,
	"groups",
);
export const PATH_MEDIA_USER_IMAGES   = join(
	PATH_USER_IMAGES,
	"medias",
);
export const PATH_EPISODE_USER_IMAGES = join(
	PATH_USER_IMAGES,
	"episodes",
);
const PATH_IMAGE_CACHE = join(
	PATH_DATA,
	"image-cache",
);
export const PATH_GROUP_IMAGE_CACHE   = join(
	PATH_IMAGE_CACHE,
	"groups",
);
export const PATH_MEDIA_IMAGE_CACHE   = join(
	PATH_IMAGE_CACHE,
	"medias",
);
export const PATH_EPISODE_IMAGE_CACHE = join(
	PATH_IMAGE_CACHE,
	"episodes",
);
export const PATH_LOGS                = join(
	PATH_USER_DATA,
	"logs",
);
