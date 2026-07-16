import type Database from "better-sqlite3";
import { createHash } from "node:crypto";

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function assertPresent<T>(value: T | null | undefined, message: string): asserts value is T {
	assert(
		value != null,
		message,
	);
}

interface SchemaObjectRow {
	type: string;
	name: string;
	tbl_name: string;
	sql: string | null;
}

interface SchemaSnapshot {
	fingerprint: string;
	indexes: string[];
	tables: string[];
}

const EXPECTED_SCHEMA_SNAPSHOTS: Record<string, SchemaSnapshot> = {
	main:       {
		fingerprint: "78be93e4897557f3ca888f9d5f2b4587c4b15b1cc128f2d6605048ffae5109bd",
		indexes:     [
			"idxExternalTrackingAccountsStatus",
			"idxExternalTrackingPendingExportsProviderChangedAt",
			"idxExternalTrackingProviderMediaMappingsProviderMedia",
			"idxUserAnimeGroupStatesIntegrationStatus",
			"idxUserCustomGroupStatesIntegrationStatus",
			"idxUserDownloadSearchKeywordPresetsDisplayOrder",
			"idxUserDownloadSearchProvidersSortOrder",
			"idxUserDownloadSearchQueryPresetsDisplayOrder",
			"idxUserEpisodeStatesIntegrationStatus",
			"idxUserEpisodeWatchStatesMedia",
			"idxUserGroupLineagesStatusGroupLineageId",
			"idxUserGroupLineagesUserGroupId",
			"idxUserGroupMediasGroupIdMediaId",
			"idxUserGroupMediasMediaIdGroupId",
			"idxUserGroupOverridesNameSearchKey",
			"idxUserGroupStatesIntegrationStatus",
			"idxUserGroupsBaseMediaId",
			"idxUserGroupsName",
			"idxUserGroupsNameSearchKey",
			"idxUserMediaOverridesNameSearchKey",
			"idxUserMediaStatesIntegrationStatus",
			"idxUserReleaseWatchStatesDomainStateRelease",
			"idxUserScheduledMediaRefreshesNextAttempt",
		],
		tables:      [
			"config",
			"externalTrackingAccounts",
			"externalTrackingPendingExports",
			"externalTrackingProviderMediaMappings",
			"schemaMigrations",
			"userAnimeGroupIntegrationSnapshots",
			"userAnimeGroupStates",
			"userCustomGroupIntegrationSnapshots",
			"userCustomGroupStates",
			"userDownloadBrowserConfig",
			"userDownloadSearchBuilderState",
			"userDownloadSearchKeywordPresets",
			"userDownloadSearchMediaState",
			"userDownloadSearchProviders",
			"userDownloadSearchQueryPresets",
			"userEpisodeIntegrationSnapshots",
			"userEpisodeOverrides",
			"userEpisodePlaybackIssueMoments",
			"userEpisodeStates",
			"userEpisodeWatchStates",
			"userGroupIntegrationSnapshots",
			"userGroupLineages",
			"userGroupMedias",
			"userGroupOverrides",
			"userGroupStates",
			"userGroupingReconcileConflicts",
			"userGroupingReconcileRuns",
			"userGroupingState",
			"userGroups",
			"userHiddenOfficialGroups",
			"userMediaIntegrationSnapshots",
			"userMediaOverrides",
			"userMediaPlaybackIssueMoments",
			"userMediaStates",
			"userMediaWatchStates",
			"userReleaseWatchInterestMedia",
			"userReleaseWatchStates",
			"userScheduledMediaRefreshes",
		],
	},
	anime_data: {
		fingerprint: "41392a28f2e28dcdc3606ad6dafc6b3506c6d5849627cd12d9a04f52b696648e",
		indexes:     [
			"idxAniListIngestionPriorityRequestedAt",
			"idxAniListIngestionQueueReady",
			"idxCharactersQueueReady",
			"idxEpisodeProviderMappingsEpisodeId",
			"idxEpisodeProviderMappingsProviderEpisodeId",
			"idxEpisodesMediaId",
			"idxErrorLogsIdAniList",
			"idxGenresName",
			"idxGroupLineageProviderMappingsGroupLineageId",
			"idxGroupLineagesBaseMediaId",
			"idxGroupMediaGroupId",
			"idxGroupMediaMediaId",
			"idxGroupsGroupLineageId",
			"idxGroupsName",
			"idxGroupsNameSearchKey",
			"idxJikanEpisodeThumbnailsQueueReady",
			"idxJikanEpisodesPriorityRequestedAt",
			"idxJikanEpisodesQueueReady",
			"idxJikanEpisodesStagingMediaRun",
			"idxMediaCharactersCharacterMedia",
			"idxMediaGenresGenreMedia",
			"idxMediaIdAniList",
			"idxMediaIdMal",
			"idxMediaName",
			"idxMediaNameSearchKey",
			"idxMediaNextAiringEpisode",
			"idxMediaProviderMappingsMediaProviderRank",
			"idxMediaRelationsRelatedMediaId",
			"idxMediaReleaseStartDate",
			"idxMediaTagsTagMedia",
			"idxStaffQueueReady",
			"idxTagsName",
			"idx_mediaCharacterVoiceActors_characterId",
			"idx_mediaCharacterVoiceActors_mediaLanguage",
			"idx_mediaCharacterVoiceActors_voiceActorId",
			"idx_mediaStaff_mediaId",
			"idx_mediaStaff_staffId",
		],
		tables:      [
			"aniListInsertErrorLogs",
			"characters",
			"episodeProviderMappings",
			"episodes",
			"genres",
			"groupLineageProviderMappings",
			"groupLineages",
			"groupMedia",
			"groups",
			"media",
			"mediaCharacterVoiceActors",
			"mediaCharacters",
			"mediaGenres",
			"mediaHydrationJikanEpisodesStaging",
			"mediaHydrationJikanEpisodesSyncState",
			"mediaHydrationQueueAniListIngestion",
			"mediaHydrationQueueCharacters",
			"mediaHydrationQueueJikanEpisodeThumbnails",
			"mediaHydrationQueueJikanEpisodes",
			"mediaHydrationQueueJikanEpisodesPriority",
			"mediaHydrationQueueStaff",
			"mediaJikanEpisodesCoverage",
			"mediaProviderMappings",
			"mediaRelations",
			"mediaStaff",
			"mediaTags",
			"scanState",
			"staff",
			"tags",
		],
	},
	image_data: {
		fingerprint: "31f09da4f750945337f79598d54d1e454106d7749691d2b22445222b4a701335",
		indexes:     [
			"idxCachedImagesOwner",
			"idxUserUploadedImagesOwnerRole",
		],
		tables:      [
			"activeImageSelections",
			"cachedImages",
			"userLocalImages",
			"userUploadedImages",
		],
	},
};

function normalizeSchemaSql(sql: string | null): string | null {
	return sql?.replace(
		/\s+/g,
		" ",
	).trim() ?? null;
}

function readSchemaSnapshot(db: Database.Database, databaseName: string): SchemaSnapshot {
	const rows         = db.prepare<[], SchemaObjectRow>(`
      SELECT type, name, tbl_name, sql
      FROM ${ databaseName }.sqlite_master
      WHERE type IN ('table', 'index')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
	`).all();
	const semanticRows = rows.map((row) => ({
		...row,
		sql: normalizeSchemaSql(row.sql),
	}));
	const fingerprint  = createHash("sha256")
		.update(JSON.stringify(semanticRows))
		.digest("hex");

	return {
		fingerprint,
		indexes: rows
							 .filter((row) => row.type === "index")
							 .map((row) => row.name),
		tables:  rows
							 .filter((row) => row.type === "table")
							 .map((row) => row.name),
	};
}

export function assertSchemaSnapshot(db: Database.Database, databaseName: string): void {
	const actual   = readSchemaSnapshot(
		db,
		databaseName,
	);
	const expected = EXPECTED_SCHEMA_SNAPSHOTS[ databaseName ];

	assertPresent(
		expected,
		`Missing expected schema snapshot for ${ databaseName }`,
	);
	assert(
		JSON.stringify(actual) === JSON.stringify(expected),
		`Schema snapshot mismatch for ${ databaseName }: ${ JSON.stringify(
			actual,
			null,
			2,
		) }`,
	);
}
