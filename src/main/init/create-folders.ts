import { mkdirSync } from "fs";
import {
	PATH_DATA,
	PATH_EPISODE_IMAGE_CACHE,
	PATH_EPISODE_USER_IMAGES,
	PATH_GROUP_IMAGE_CACHE,
	PATH_GROUP_USER_IMAGES,
	PATH_LOGS,
	PATH_MEDIA_IMAGE_CACHE,
	PATH_MEDIA_USER_IMAGES,
	PATH_USER_IMAGES,
} from "../../constants/main/system-folders";

// Ensure the data folder exists
mkdirSync(
	PATH_DATA,
	{ recursive: true },
);
// Ensure the user-uploaded image root exists.
mkdirSync(
	PATH_USER_IMAGES,
	{ recursive: true },
);
// Ensure the user-uploaded Group images directory exists.
mkdirSync(
	PATH_GROUP_USER_IMAGES,
	{ recursive: true },
);
// Ensure the user-uploaded Media images directory exists.
mkdirSync(
	PATH_MEDIA_USER_IMAGES,
	{ recursive: true },
);
// Ensure the user-uploaded Episode images directory exists.
mkdirSync(
	PATH_EPISODE_USER_IMAGES,
	{ recursive: true },
);
// Ensure the cached Group images directory exists.
mkdirSync(
	PATH_GROUP_IMAGE_CACHE,
	{ recursive: true },
);
// Ensure the cached Media images directory exists.
mkdirSync(
	PATH_MEDIA_IMAGE_CACHE,
	{ recursive: true },
);
// Ensure the cached Episode images directory exists.
mkdirSync(
	PATH_EPISODE_IMAGE_CACHE,
	{ recursive: true },
);
// Ensure the logs directory exists
mkdirSync(
	PATH_LOGS,
	{ recursive: true },
);
