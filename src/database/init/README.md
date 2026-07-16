# Database Init Overview

This folder contains startup initialization for local SQLite databases.

## What runs at startup

`src/main/main.ts` calls `initDatabases()` during `app.whenReady()`.

`initDatabases()` (`src/database/init/init-databases.ts`) does this:

1. Opens `user_data.db` (main DB handle).
2. Attaches `anime_data.db` as `anime_data`.
3. Attaches `image_data.db` as `image_data`.
4. Applies pragma tuning to the main DB and attached schemas.
5. Initializes user config schema (`init-user-db.ts`).
6. Initializes anime schema and indexes (`init-anime-db.ts`).
7. Initializes local image-cache metadata schema (`init-image-db.ts`).
8. Re-enables foreign keys and publishes DB handle on `BUS_Database`.

## Schema Ownership

- `init-user-db.ts`: orchestration for user preferences, app settings, migration bookkeeping, grouping, integration,
  release-watch, download-search, and user indexes.
- `init-anime-db.ts`: orchestration for anime catalog, group/provider-relation graph, people credits,
  network-enrichment queue tables, and anime indexes.
- `init-image-db.ts`: local provider-image cache metadata and fetch bookkeeping.
- `schema-migrations.ts`: central user_data-owned migration bookkeeping. It creates only
  `user_data.schemaMigrations`; approved migrations may target any attached DB.

## Schema Change Policy

The released AnimeDB V1 schema is frozen. Before the first public app release, owner-authorized `user_data.db` and
`image_data.db` changes may update their initialization schema and smoke snapshot directly because no supported user
installation exists yet.

Do not change schema fields, constraints, indexes, table ownership, or persisted enum meanings without explicit owner
authorization. AnimeDB changes still require a migration or replacement plan; pre-release mutable DB changes must state
their reset/data-loss impact and update the tests that protect initialization.

## Notes for maintainers

- Initialization is idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`).
- User/anime init modules are split by domain but still execute inside one transaction per DB.
- If an approved schema change is made, update:
    - init SQL here
    - related query files in `src/database/operations`
    - shared types in `src/shared/types`
    - migration/replacement documentation and tests required by the approval
- Keep naming conventions consistent (`mediaId` / `mediaIds`).
