import type { Database } from "better-sqlite3";

export function initAnimeIndexes(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        CREATE INDEX IF NOT EXISTS anime_data.idxEpisodesMediaId
            ON episodes (mediaId);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaIdAniList
            ON media (idAniList);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaIdMal
            ON media (idMal);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaName
            ON media (name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaReleaseStartDate
            ON media (isStub, startDateYear, startDateMonth, startDateDay, mediaId);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaNextAiringEpisode
            ON media (isStub, nextAiringEpisode, mediaId);

        -- idxGenresName:
        -- Library metadata filtering resolves selected genre chips by normalized provider names.
        CREATE INDEX IF NOT EXISTS anime_data.idxGenresName
            ON genres (name COLLATE NOCASE);
        -- idxTagsName:
        -- Library metadata filtering resolves selected safe tag chips by provider names.
        CREATE INDEX IF NOT EXISTS anime_data.idxTagsName
            ON tags (name COLLATE NOCASE);
        -- idxMediaGenresGenreMedia:
        -- Supports Library filters that find media by selected genres before checking membership.
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaGenresGenreMedia
            ON mediaGenres (genreId, mediaId);
        -- idxMediaTagsTagMedia:
        -- Supports Library filters that find media by selected tags before checking membership.
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaTagsTagMedia
            ON mediaTags (tagId, mediaId);

        CREATE INDEX IF NOT EXISTS anime_data.idxGroupLineagesBaseMediaId
            ON groupLineages (baseMediaId);
        CREATE INDEX IF NOT EXISTS anime_data.idxGroupsGroupLineageId
            ON groups (groupLineageId);
        CREATE INDEX IF NOT EXISTS anime_data.idxGroupMediaGroupId
            ON groupMedia (groupId);
        CREATE INDEX IF NOT EXISTS anime_data.idxGroupMediaMediaId
            ON groupMedia (mediaId);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaRelationsRelatedMediaId
            ON mediaRelations (relatedMediaId);

        -- idxMediaProviderMappingsMediaProviderRank:
        -- Internal services resolve the best provider id for one media/provider pair
        -- by primary flag and verification recency; provider->media lookup is covered by the PK.
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaProviderMappingsMediaProviderRank
            ON mediaProviderMappings (mediaId, provider, isPrimary DESC, lastVerifiedAt DESC);
        CREATE INDEX IF NOT EXISTS anime_data.idxEpisodeProviderMappingsEpisodeId
            ON episodeProviderMappings (episodeId);
        CREATE UNIQUE INDEX IF NOT EXISTS anime_data.idxEpisodeProviderMappingsProviderEpisodeId
            ON episodeProviderMappings (provider, providerEpisodeId);
        CREATE INDEX IF NOT EXISTS anime_data.idxGroupLineageProviderMappingsGroupLineageId
            ON groupLineageProviderMappings (groupLineageId);

        -- idxMediaCharactersCharacterMedia:
        -- Character inspection reads appearances only from fully scanned media;
        -- the media-first primary key supports the opposite media-detail lookup.
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaCharactersCharacterMedia
            ON mediaCharacters (characterId, mediaId);
        -- idx_mediaCharacterVoiceActors_voiceActorId:
        -- Speeds the voice actor detail page, which resolves all local
        -- character/media credits for one AniList staff ID.
        CREATE INDEX IF NOT EXISTS anime_data.idx_mediaCharacterVoiceActors_voiceActorId
            ON mediaCharacterVoiceActors (voiceActorId);
        -- idx_mediaCharacterVoiceActors_characterId:
        -- Speeds the character detail page voice-actor section.
        CREATE INDEX IF NOT EXISTS anime_data.idx_mediaCharacterVoiceActors_characterId
            ON mediaCharacterVoiceActors (characterId);
        -- idx_mediaCharacterVoiceActors_mediaLanguage:
        -- Speeds the media Characters tab language dropdown and per-card switches.
        CREATE INDEX IF NOT EXISTS anime_data.idx_mediaCharacterVoiceActors_mediaLanguage
            ON mediaCharacterVoiceActors (mediaId, voiceActorLanguage);
        -- idx_mediaStaff_staffId:
        -- Speeds the staff detail page, which lists all local media credits.
        CREATE INDEX IF NOT EXISTS anime_data.idx_mediaStaff_staffId
            ON mediaStaff (staffId);
        -- idx_mediaStaff_mediaId:
        -- Speeds the media Staff tab.
        CREATE INDEX IF NOT EXISTS anime_data.idx_mediaStaff_mediaId
            ON mediaStaff (mediaId);

        CREATE INDEX IF NOT EXISTS anime_data.idxJikanEpisodesStagingMediaRun
            ON mediaHydrationJikanEpisodesStaging (mediaId, syncRunId);
        CREATE INDEX IF NOT EXISTS anime_data.idxJikanEpisodesPriorityRequestedAt
            ON mediaHydrationQueueJikanEpisodesPriority (requestedAt DESC);
        -- idxAniListIngestionQueueReady:
        -- Frozen with the legacy ID-only promotion queue. Runtime scanner and
        -- hydration paths no longer read it.
        CREATE INDEX IF NOT EXISTS anime_data.idxAniListIngestionQueueReady
            ON mediaHydrationQueueAniListIngestion (status, retryCount, priority DESC, requestedAt DESC, mediaId ASC);
        -- idxCharactersQueueReady:
        -- Character hydration is a DB-backed work queue; status/retryCount drives
        -- daemon readiness and the global Errored Content projection.
        CREATE INDEX IF NOT EXISTS anime_data.idxCharactersQueueReady
            ON mediaHydrationQueueCharacters (status, retryCount, mediaId);
        -- idxStaffQueueReady:
        -- Staff hydration has the same queue lifecycle as characters but separate
        -- ownership/cadence, so it needs its own readiness index.
        CREATE INDEX IF NOT EXISTS anime_data.idxStaffQueueReady
            ON mediaHydrationQueueStaff (status, retryCount, mediaId);
        -- idxJikanEpisodesQueueReady:
        -- Jikan episode hydration uses retry backoff based on lastTriedAt; keep
        -- daemon readiness, next-retry lookup, and Errored Content reads bounded.
        CREATE INDEX IF NOT EXISTS anime_data.idxJikanEpisodesQueueReady
            ON mediaHydrationQueueJikanEpisodes (status, retryCount, lastTriedAt, mediaId);
        -- idxJikanEpisodeThumbnailsQueueReady:
        -- Thumbnail enrichment is its own resumable queue; status/retryCount and
        -- lastTriedAt bound cooldown scans while priority/requestedAt preserve manual ordering.
        CREATE INDEX IF NOT EXISTS anime_data.idxJikanEpisodeThumbnailsQueueReady
            ON mediaHydrationQueueJikanEpisodeThumbnails (status, retryCount, lastTriedAt, priority, requestedAt);
        -- idxAniListIngestionPriorityRequestedAt:
        -- Frozen with the legacy ID-only promotion queue. Runtime scanner and
        -- hydration paths no longer read it.
        CREATE INDEX IF NOT EXISTS anime_data.idxAniListIngestionPriorityRequestedAt
            ON mediaHydrationQueueAniListIngestion (priority DESC, requestedAt DESC, mediaId ASC);

        CREATE INDEX IF NOT EXISTS anime_data.idxGroupsName
            ON groups (name COLLATE NOCASE);
        -- Library search compares against the lossy normalized key so title
        -- accents, separators, and case do not affect DB-backed matches.
        CREATE INDEX IF NOT EXISTS anime_data.idxGroupsNameSearchKey
            ON groups (nameSearchKey);
        CREATE INDEX IF NOT EXISTS anime_data.idxMediaNameSearchKey
            ON media (nameSearchKey);
        CREATE INDEX IF NOT EXISTS anime_data.idxErrorLogsIdAniList
            ON aniListInsertErrorLogs (idAniList);
	`);
}
