import type { Database } from "better-sqlite3";

export function initUserIndexes(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idxUserGroupsBaseMediaId
            ON userGroups (baseMediaId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupsName
            ON userGroups (name COLLATE NOCASE);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- User-visible Library search uses this normalized key rather than the
        -- display name, matching the anime_data group/media search contract.
        CREATE INDEX IF NOT EXISTS idxUserGroupsNameSearchKey
            ON userGroups (nameSearchKey);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupOverridesNameSearchKey
            ON userGroupOverrides (nameSearchKey);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserMediaOverridesNameSearchKey
            ON userMediaOverrides (nameSearchKey);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupMediasGroupIdMediaId
            ON userGroupMedias (groupId, mediaId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupMediasMediaIdGroupId
            ON userGroupMedias (mediaId, groupId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupLineagesUserGroupId
            ON userGroupLineages (userGroupId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupLineagesStatusGroupLineageId
            ON userGroupLineages (status, groupLineageId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserEpisodeStatesIntegrationStatus
            ON userEpisodeStates (integrationStatus);
	`);
	// noinspection SqlResolve
	db.exec(`
		-- idxExternalTrackingPendingExportsProviderChangedAt:
		-- Manual export reads one provider's dirty rows in stable change order.
		CREATE INDEX IF NOT EXISTS idxExternalTrackingPendingExportsProviderChangedAt
			ON externalTrackingPendingExports (provider, changedAt, mediaId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserEpisodeWatchStatesMedia
            ON userEpisodeWatchStates (mediaId, episodeNumber);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxExternalTrackingAccountsStatus
            ON externalTrackingAccounts (status);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxExternalTrackingProviderMediaMappingsProviderMedia
            ON externalTrackingProviderMediaMappings (provider, providerMediaId);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserMediaStatesIntegrationStatus
            ON userMediaStates (integrationStatus);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserGroupStatesIntegrationStatus
            ON userGroupStates (integrationStatus);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserAnimeGroupStatesIntegrationStatus
            ON userAnimeGroupStates (integrationStatus);
	`);
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS idxUserCustomGroupStatesIntegrationStatus
            ON userCustomGroupStates (integrationStatus);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- idxUserReleaseWatchStatesDomainStateRelease:
        -- Release Watch calendar pages filter by domain/state and page by resolved release time.
        CREATE INDEX IF NOT EXISTS idxUserReleaseWatchStatesDomainStateRelease
            ON userReleaseWatchStates (watchDomain, state, resolvedReleaseAt);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- idxUserScheduledMediaRefreshesNextAttempt:
        -- Retry daemon reads due rows ordered by nextAttemptAt/mediaId; cooldownUntil
        -- stays in the index so post-crash recovery can skip cooled-down rows without table lookups.
        CREATE INDEX IF NOT EXISTS idxUserScheduledMediaRefreshesNextAttempt
            ON userScheduledMediaRefreshes (nextAttemptAt, mediaId, cooldownUntil);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- idxUserDownloadSearchProvidersSortOrder:
        -- Settings reads load all providers in user-defined order; enabled toggles update by primary key.
        CREATE INDEX IF NOT EXISTS idxUserDownloadSearchProvidersSortOrder
            ON userDownloadSearchProviders (sortOrder, id);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- idxUserDownloadSearchKeywordPresetsDisplayOrder:
        -- Query builder reads all keyword presets grouped by category and label.
        CREATE INDEX IF NOT EXISTS idxUserDownloadSearchKeywordPresetsDisplayOrder
            ON userDownloadSearchKeywordPresets (category, label);
	`);
	// noinspection SqlResolve
	db.exec(`
        -- idxUserDownloadSearchQueryPresetsDisplayOrder:
        -- Saved query presets are shown by creation order, with label as a stable tie-breaker.
        CREATE INDEX IF NOT EXISTS idxUserDownloadSearchQueryPresetsDisplayOrder
            ON userDownloadSearchQueryPresets (createdAt, label);
	`);
}
