# Shared Types Map

This folder owns the contracts that cross database, main, preload, and renderer boundaries.

## Main contract groups

- Provider payloads live in `ani-list-media-api.ts`, `jikan-api.ts`, and `provider-clients.ts`.
- Database DTOs are split across the `anime-db-*.ts` domain files. `anime-db.ts` is the compatibility barrel.
- IPC payloads are split across the `ipc-*.ts` domain files. `ipc-payloads.ts` is the compatibility barrel.
- Preload contracts are split across `electron-api-*.ts`; `electron-api.ts` assembles `window.electronAPI`.
- Canonical and provider identifier aliases live in `nimlat-ids.ts`.
- Standalone domains such as release watch, external tracking, download search, and app updates keep their own files.

## Naming and ownership

- `mediaId` is the current SQLite and IPC media key.
- `idAniList` is the stable AniList identity used to reconcile catalog rows.
- `idMal` is optional provider metadata for MAL/Jikan enrichment.
- A Group ID is valid only together with its source (`official` or `user`).
- Internal Group, Media, and Episode names use `name`; raw provider payloads keep their upstream field names.

## Maintenance

- Public cross-layer types belong here; feature-private helper types stay beside their implementation.
- Keep compatibility barrels thin: they re-export domain contracts and contain no alternate model.
- Map provider payloads to DB DTOs, DB DTOs to app models, and app models to IPC payloads explicitly.
- A DB shape change also requires approved migration work, matching init/query updates, and focused preservation tests.
