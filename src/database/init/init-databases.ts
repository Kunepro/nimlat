import { BUS_Database } from "@nimlat/busses/main";
import {
	PATH_ANIME_DB,
	PATH_IMAGE_DB,
	PATH_USER_DB,
} from "@nimlat/constants/main/system-folders";
import Database, { Database as IDatabase } from "better-sqlite3";
import {
	applyDatabasePragmas,
	attachDatabase,
} from "./database-attachment";
import { initAnimeDb } from "./init-anime-db";
import { initImageDb } from "./init-image-db";
import { initUserDb } from "./init-user-db";

// Open user_data.db and attach replaceable anime_data plus local image_data.
export function initDatabases(): IDatabase {
	const db = new Database(PATH_USER_DB);

	db.pragma("foreign_keys = OFF");

	attachDatabase(
		db,
		PATH_ANIME_DB,
		"anime_data",
	);
	attachDatabase(
		db,
		PATH_IMAGE_DB,
		"image_data",
	);

	applyDatabasePragmas(db);

	initUserDb(db);
	initAnimeDb(db);
	initImageDb(db);

	db.pragma("foreign_keys = ON");

	BUS_Database.next(db);

	return db;
}
