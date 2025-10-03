import { BUS_Database } from '@nimlat/busses';
import {
  PATH_ANIME_DB,
  PATH_SERIES_HYDRATION_DB,
  PATH_USER_DB,
} from '@nimlat/const/main/system-folders';
import Database, { Database as IDatabase } from 'better-sqlite3';
import { initAnimeDb } from './init-anime-db';
import { initSeriesHydrationDb } from './init-series-hydration-db';
import { initUserDb } from './init-user-db';

// Open (or create) user_data.db and attach anime_data.db and series_hydration.db
export function initDatabases(): IDatabase {
  const db = new Database(PATH_USER_DB);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -8192');
  db.pragma('locking_mode = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('mmap_size = 268435456');
  db.pragma('busy_timeout = 5000');

  db.exec(`ATTACH DATABASE '${PATH_ANIME_DB}' AS anime_data;`);
  db.exec(`ATTACH DATABASE '${PATH_SERIES_HYDRATION_DB}' AS series_hydration;`);

  initUserDb(db);
  initAnimeDb(db);
  initSeriesHydrationDb(db);

  BUS_Database.next(db);

  return db;
}
