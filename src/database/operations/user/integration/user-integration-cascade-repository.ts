import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import type {
	IntegrationStatus,
	UserEpisodePlaybackIssueMomentDto,
	UserEpisodeStateDto,
	UserGroupingMode,
	UserMediaPlaybackIssueMomentRowDto,
	UserMediaStateRowDto,
} from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { resolveOrSeedCanonicalEpisodeIdByLegacyKey } from "../../anime/canonical/canonical-id-resolution";
import {
	getDefaultEpisodeState,
	getDefaultMediaState,
	normalizePlaybackIssueNote,
	toBooleanNumber,
} from "./user-integration-state-helpers";
import type {
	CountRow,
	EpisodeIntegrationStatusRow,
	EpisodeNumberRow,
	EpisodeStateRow,
	GroupExistsRow,
	IntegrationPercentRow,
	IpIdRow,
	MediaIdRow,
	MediaIntegrationStatusRow,
	MediaStateRow,
} from "./user-integration-state-statements";
import {
	STMT_COUNT_EPISODE_PLAYBACK_ISSUE_MOMENTS,
	STMT_COUNT_MEDIA_PLAYBACK_ISSUE_MOMENTS,
	STMT_DELETE_EPISODE_PLAYBACK_ISSUE_MOMENTS,
	STMT_DELETE_MEDIA_PLAYBACK_ISSUE_MOMENTS,
	STMT_INSERT_EPISODE_PLAYBACK_ISSUE_MOMENT,
	STMT_INSERT_MEDIA_PLAYBACK_ISSUE_MOMENT,
	STMT_SELECT_EPISODE_INTEGRATION_PERCENTS_BY_MEDIA,
	STMT_SELECT_EPISODE_INTEGRATION_STATUSES_BY_MEDIA,
	STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA,
	STMT_SELECT_EPISODE_STATE,
	STMT_SELECT_GROUP_EXISTS_ANIME,
	STMT_SELECT_GROUP_EXISTS_USER,
	STMT_SELECT_GROUP_IDS_BY_MEDIA_ANIME,
	STMT_SELECT_GROUP_IDS_BY_MEDIA_USER,
	STMT_SELECT_MEDIA_IDS_BY_GROUP_ANIME,
	STMT_SELECT_MEDIA_IDS_BY_GROUP_USER,
	STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_ANIME,
	STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_USER,
	STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_ANIME,
	STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_USER,
	STMT_SELECT_MEDIA_STATE,
	STMT_UPSERT_ANIME_GROUP_INTEGRATION_SNAPSHOT,
	STMT_UPSERT_ANIME_GROUP_STATE,
	STMT_UPSERT_CUSTOM_GROUP_INTEGRATION_SNAPSHOT,
	STMT_UPSERT_CUSTOM_GROUP_STATE,
	STMT_UPSERT_EPISODE_INTEGRATION_SNAPSHOT,
	STMT_UPSERT_EPISODE_STATE,
	STMT_UPSERT_MEDIA_INTEGRATION_SNAPSHOT,
	STMT_UPSERT_MEDIA_STATE,
} from "./user-integration-state-statements";

// DB-facing adapter for integration cascade statements. The manager owns cascade
// order and derived-state rules; this repository owns SQL, canonical episode ids,
// and storage normalization.
export class UserIntegrationCascadeRepository {
	public constructor(private readonly db: Database) {}

	public runInTransaction<T>(operation: () => T): T {
		return this.db.transaction(operation)();
	}

	public getEpisodeStateRow(mediaId: number, episodeNumber: number): EpisodeStateRow {
		const episodeId = this.resolveEpisodeId(
			mediaId,
			episodeNumber,
		);
		return (this.db.prepare(STMT_SELECT_EPISODE_STATE)
			.get(episodeId) as EpisodeStateRow | undefined) || getDefaultEpisodeState();
	}

	public getMediaStateRow(mediaId: number): MediaStateRow {
		return (this.db.prepare(STMT_SELECT_MEDIA_STATE)
			.get(mediaId) as MediaStateRow | undefined) || getDefaultMediaState();
	}

	public upsertEpisodeStateRow(state: UserEpisodeStateDto): void {
		const episodeId = this.resolveEpisodeId(
			state.mediaId,
			state.episodeNumber,
		);
		this.db.prepare(STMT_UPSERT_EPISODE_STATE)
			.run(
				episodeId,
				normalizeIntegrationStatus(state.integrationStatus),
				normalizePlaybackIssueNote(state.playbackIssueNote),
				toBooleanNumber(state.hasDubIssue),
				toBooleanNumber(state.hasSubIssue),
				toBooleanNumber(state.hasEncodingIssue),
				toBooleanNumber(state.hasAudioIssue),
				toBooleanNumber(state.hasVideoIssue),
				state.updatedAt,
			);
	}

	public upsertMediaStateRow(state: UserMediaStateRowDto): void {
		this.db.prepare(STMT_UPSERT_MEDIA_STATE)
			.run(
				state.mediaId,
				normalizeIntegrationStatus(state.integrationStatus),
				normalizePlaybackIssueNote(state.playbackIssueNote),
				toBooleanNumber(state.hasDubIssue),
				toBooleanNumber(state.hasSubIssue),
				toBooleanNumber(state.hasEncodingIssue),
				toBooleanNumber(state.hasAudioIssue),
				toBooleanNumber(state.hasVideoIssue),
				state.updatedAt,
			);
	}

	public upsertGroupStateRow(
		groupId: number,
		integrationStatus: IntegrationStatus | null,
		updatedAt: number,
		groupingMode: UserGroupingMode,
	): void {
		const statement = groupingMode === "user"
			? STMT_UPSERT_CUSTOM_GROUP_STATE
			: STMT_UPSERT_ANIME_GROUP_STATE;
		this.db.prepare(statement).run(
			groupId,
			normalizeIntegrationStatus(integrationStatus),
			updatedAt,
		);
	}

	public replaceEpisodePlaybackIssueMoments(
		mediaId: number,
		episodeNumber: number,
		playbackIssueMoments: UserEpisodePlaybackIssueMomentDto[],
	): void {
		const episodeId = this.resolveEpisodeId(
			mediaId,
			episodeNumber,
		);
		this.db.prepare(STMT_DELETE_EPISODE_PLAYBACK_ISSUE_MOMENTS)
			.run(episodeId);

		const insertMoment = this.db.prepare(STMT_INSERT_EPISODE_PLAYBACK_ISSUE_MOMENT);
		playbackIssueMoments.forEach((moment) => {
			const momentEpisodeId = this.resolveEpisodeId(
				moment.mediaId,
				moment.episodeNumber,
			);
			insertMoment.run(
				momentEpisodeId,
				moment.playbackIssueCategory,
				moment.timeSeconds,
				normalizePlaybackIssueNote(moment.note),
				moment.updatedAt,
			);
		});
	}

	public replaceMediaPlaybackIssueMoments(
		mediaId: number,
		playbackIssueMoments: UserMediaPlaybackIssueMomentRowDto[],
	): void {
		this.db.prepare(STMT_DELETE_MEDIA_PLAYBACK_ISSUE_MOMENTS)
			.run(mediaId);

		const insertMoment = this.db.prepare(STMT_INSERT_MEDIA_PLAYBACK_ISSUE_MOMENT);
		playbackIssueMoments.forEach((moment) => {
			insertMoment.run(
				moment.mediaId,
				moment.playbackIssueCategory,
				moment.timeSeconds,
				normalizePlaybackIssueNote(moment.note),
				moment.updatedAt,
			);
		});
	}

	public getGroupIdsByMediaId(mediaId: number, groupingMode: UserGroupingMode): number[] {
		const statement = groupingMode === "user"
			? STMT_SELECT_GROUP_IDS_BY_MEDIA_USER
			: STMT_SELECT_GROUP_IDS_BY_MEDIA_ANIME;
		return (this.db.prepare(statement).all(mediaId) as IpIdRow[]).map(row => row.groupId);
	}

	public getMediaIdsByGroupId(groupId: number, groupingMode: UserGroupingMode): number[] {
		const statement = groupingMode === "user"
			? STMT_SELECT_MEDIA_IDS_BY_GROUP_USER
			: STMT_SELECT_MEDIA_IDS_BY_GROUP_ANIME;
		return (this.db.prepare(statement).all(groupId) as MediaIdRow[]).map(row => row.mediaId);
	}

	public getEpisodeNumbersByMediaId(mediaId: number): number[] {
		return (this.db.prepare(STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA)
			.all(mediaId) as EpisodeNumberRow[]).map(row => row.episodeNumber);
	}

	public getEpisodeIntegrationStatusesByMediaId(mediaId: number): Array<IntegrationStatus | null> {
		return (this.db.prepare(STMT_SELECT_EPISODE_INTEGRATION_STATUSES_BY_MEDIA)
			.all(mediaId) as EpisodeIntegrationStatusRow[]).map(row => normalizeIntegrationStatus(row.integrationStatus));
	}

	public getMediaIntegrationStatusesByGroupId(
		groupId: number,
		groupingMode: UserGroupingMode,
	): Array<IntegrationStatus | null> {
		const statement = groupingMode === "user"
			? STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_USER
			: STMT_SELECT_MEDIA_INTEGRATION_STATUSES_BY_GROUP_ANIME;
		return (this.db.prepare(statement)
			.all(groupId) as MediaIntegrationStatusRow[]).map(row => normalizeIntegrationStatus(row.integrationStatus));
	}

	public groupExists(groupId: number, groupingMode: UserGroupingMode): boolean {
		const statement = groupingMode === "user"
			? STMT_SELECT_GROUP_EXISTS_USER
			: STMT_SELECT_GROUP_EXISTS_ANIME;
		const row       = this.db.prepare(statement).get(groupId) as GroupExistsRow | undefined;
		return (row?.total ?? 0) > 0;
	}

	public countEpisodePlaybackIssueMoments(mediaId: number, episodeNumber: number): number {
		const episodeId = this.resolveEpisodeId(
			mediaId,
			episodeNumber,
		);
		return (this.db.prepare(STMT_COUNT_EPISODE_PLAYBACK_ISSUE_MOMENTS)
			.get(episodeId) as CountRow).total;
	}

	public countMediaPlaybackIssueMoments(mediaId: number): number {
		return (this.db.prepare(STMT_COUNT_MEDIA_PLAYBACK_ISSUE_MOMENTS)
			.get(mediaId) as CountRow).total;
	}

	public upsertEpisodeIntegrationSnapshot(
		mediaId: number,
		episodeNumber: number,
		integrationPercent: number | null,
		updatedAt: number,
	): void {
		const episodeId = this.resolveEpisodeId(
			mediaId,
			episodeNumber,
		);
		this.db.prepare(STMT_UPSERT_EPISODE_INTEGRATION_SNAPSHOT)
			.run(
				episodeId,
				integrationPercent,
				updatedAt,
			);
	}

	public getEpisodeIntegrationPercentsByMediaId(mediaId: number): Array<number | null> {
		return (this.db.prepare(STMT_SELECT_EPISODE_INTEGRATION_PERCENTS_BY_MEDIA)
			.all(mediaId) as IntegrationPercentRow[]).map(row => row.integrationPercent);
	}

	public upsertMediaIntegrationSnapshot(
		mediaId: number,
		integrationPercent: number | null,
		updatedAt: number,
	): void {
		this.db.prepare(STMT_UPSERT_MEDIA_INTEGRATION_SNAPSHOT)
			.run(
				mediaId,
				integrationPercent,
				updatedAt,
			);
	}

	public getMediaIntegrationPercentsByGroupId(
		groupId: number,
		groupingMode: UserGroupingMode,
	): Array<number | null> {
		const statement = groupingMode === "user"
			? STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_USER
			: STMT_SELECT_MEDIA_INTEGRATION_PERCENTS_BY_GROUP_ANIME;
		return (this.db.prepare(statement)
			.all(groupId) as IntegrationPercentRow[]).map(row => row.integrationPercent);
	}

	public upsertGroupIntegrationSnapshot(
		groupId: number,
		integrationPercent: number | null,
		updatedAt: number,
		groupingMode: UserGroupingMode,
	): void {
		const statement = groupingMode === "user"
			? STMT_UPSERT_CUSTOM_GROUP_INTEGRATION_SNAPSHOT
			: STMT_UPSERT_ANIME_GROUP_INTEGRATION_SNAPSHOT;
		this.db.prepare(statement).run(
			groupId,
			integrationPercent,
			updatedAt,
		);
	}

	private resolveEpisodeId(mediaId: number, episodeNumber: number): number {
		return resolveOrSeedCanonicalEpisodeIdByLegacyKey(
			this.db,
			mediaId,
			episodeNumber,
		);
	}
}

export function createUserIntegrationCascadeRepository(): UserIntegrationCascadeRepository {
	return new UserIntegrationCascadeRepository(getDatabase());
}
