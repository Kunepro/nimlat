import { app } from "electron";
import { join } from "path";

export const PATH_USER_DATA           = app.getPath("userData");
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
export const PATH_SERIES_HYDRATION_DB = join(
	PATH_USER_DATA,
	"data",
	"series_hydration.db",
);
export const PATH_PRELOAD_JS          = join(
	__dirname,
	"preload.js",
);
export const PATH_ICON                = join(
	__dirname,
	"icon.ico",
);
export const PATH_INDEX_HTML          = join(
	__dirname,
	"index.html",
);
export const PATH_DATA                = join(
	PATH_USER_DATA,
	"data",
);
export const PATH_LOGS                = join(
	PATH_USER_DATA,
	"logs",
);
