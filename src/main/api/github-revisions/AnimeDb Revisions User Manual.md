# AnimeDB Releases User Manual

Nimlat bootstraps `anime_data.db` from GitHub Releases. The configured source is
`Kunepro/nimlat-dbs`; change `src/constants/main/anime-db-release-source.ts` only when the release repository or
asset naming contract intentionally changes.

## Publish a baseline

1. Build and validate the distributable `anime_data.db`.
2. Create a GitHub release in the configured repository with a non-empty tag.
3. Attach one raw SQLite `.db` asset whose name contains `anime_data`.
4. Confirm GitHub exposes a valid SHA-256 asset digest.
5. Publish the release. Draft releases are ignored.

Keep one matching database asset per release so selection remains unambiguous.

## Runtime selection

The app scans releases newest first, ignores drafts, and prefers the newest stable release with a matching asset and a
valid SHA-256 digest. If no stable release is available, it can fall back to the newest valid prerelease.

The download is rejected when:

- the release tag is empty;
- no matching `.db` asset has a valid digest;
- the downloaded checksum differs from the GitHub digest;
- the database fails the grouping/reconcile safety checks.

After validation, replacement uses a temporary file plus backup/rollback of the installed AnimeDB.

## Access policy

The downloader uses unauthenticated GitHub release reads. The release repository and its assets therefore need to be
public unless the download client is deliberately extended with an authenticated flow.
