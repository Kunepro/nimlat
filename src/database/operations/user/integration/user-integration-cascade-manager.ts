import type {
	IntegrationCascadeResultDto,
	IntegrationStatus,
	UserEpisodePlaybackIssueMomentDto,
	UserEpisodeStateDto,
	UserGroupingMode,
	UserMediaPlaybackIssueMomentRowDto,
	UserMediaStateRowDto,
} from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { dedupePlaybackIssueMoments } from "./user-integration-cascade-policy";
import type { UserIntegrationCascadeRepository } from "./user-integration-cascade-repository";
import { createUserIntegrationCascadeRepository } from "./user-integration-cascade-repository";
import { UserIntegrationSnapshotRecomputer } from "./user-integration-snapshot-recomputer";
import { toNumberAsBooleanLiteral } from "./user-integration-state-helpers";

// Centralize integration-state writes and the persisted completion cascade so every mutation
// recomputes the same derived values from the same rules.
export class UserIntegrationCascadeManager {
	private readonly snapshotRecomputer: UserIntegrationSnapshotRecomputer;

	public constructor(private readonly repository: UserIntegrationCascadeRepository) {
		this.snapshotRecomputer = new UserIntegrationSnapshotRecomputer(repository);
	}

	public replaceEpisodeStateAndCascade(
		state: UserEpisodeStateDto,
		playbackIssueMoments: UserEpisodePlaybackIssueMomentDto[],
	): IntegrationCascadeResultDto {
		return this.repository.runInTransaction(() => {
			this.repository.upsertEpisodeStateRow(state);
			this.repository.replaceEpisodePlaybackIssueMoments(
				state.mediaId,
				state.episodeNumber,
				dedupePlaybackIssueMoments(playbackIssueMoments),
			);
			this.snapshotRecomputer.recomputeEpisodeIntegration(
				state.mediaId,
				state.episodeNumber,
				state.updatedAt,
			);
			this.snapshotRecomputer.syncMediaStatusFromEpisodeStates(
				state.mediaId,
				state.updatedAt,
			);

			return this.snapshotRecomputer.recomputeCascadeForMediaIds(
				[ state.mediaId ],
				state.updatedAt,
			);
		});
	}

	public replaceMediaStateAndCascade(state: UserMediaStateRowDto): IntegrationCascadeResultDto {
		return this.replaceMediaStateAndCascadeWithMoments(
			state,
			[],
		);
	}

	public replaceMediaStateAndCascadeWithMoments(
		state: UserMediaStateRowDto,
		playbackIssueMoments: UserMediaPlaybackIssueMomentRowDto[],
	): IntegrationCascadeResultDto {
		return this.repository.runInTransaction(() => {
			this.repository.upsertMediaStateRow(state);
			this.repository.replaceMediaPlaybackIssueMoments(
				state.mediaId,
				dedupePlaybackIssueMoments(playbackIssueMoments),
			);
			const episodeNumbers = this.repository.getEpisodeNumbersByMediaId(state.mediaId);
			episodeNumbers.forEach((episodeNumber) => {
				this.snapshotRecomputer.recomputeEpisodeIntegration(
					state.mediaId,
					episodeNumber,
					state.updatedAt,
				);
			});

			return this.snapshotRecomputer.recomputeCascadeForMediaIds(
				[ state.mediaId ],
				state.updatedAt,
			);
		});
	}

	public setEpisodeIntegrationStatusAndCascade(
		mediaId: number,
		episodeNumber: number,
		integrationStatus: IntegrationStatus | null,
	): IntegrationCascadeResultDto {
		const updatedAt = Date.now();
		return this.repository.runInTransaction(() => {
			const currentState = this.repository.getEpisodeStateRow(
				mediaId,
				episodeNumber,
			);
			this.repository.upsertEpisodeStateRow({
				mediaId,
				episodeNumber,
				integrationStatus,
				playbackIssueNote: currentState.playbackIssueNote,
				hasDubIssue:       toNumberAsBooleanLiteral(currentState.hasDubIssue),
				hasSubIssue:       toNumberAsBooleanLiteral(currentState.hasSubIssue),
				hasEncodingIssue:  toNumberAsBooleanLiteral(currentState.hasEncodingIssue),
				hasAudioIssue:     toNumberAsBooleanLiteral(currentState.hasAudioIssue),
				hasVideoIssue:     toNumberAsBooleanLiteral(currentState.hasVideoIssue),
				updatedAt,
			});
			this.snapshotRecomputer.recomputeEpisodeIntegration(
				mediaId,
				episodeNumber,
				updatedAt,
			);
			this.snapshotRecomputer.syncMediaStatusFromEpisodeStates(
				mediaId,
				updatedAt,
			);

			return this.snapshotRecomputer.recomputeCascadeForMediaIds(
				[ mediaId ],
				updatedAt,
			);
		});
	}

	public setMediaIntegrationStatusAndCascade(
		mediaId: number,
		integrationStatus: IntegrationStatus | null,
	): IntegrationCascadeResultDto {
		const updatedAt = Date.now();
		return this.repository.runInTransaction(() => {
			this.snapshotRecomputer.updateMediaAndEpisodesIntegrationStatus(
				mediaId,
				integrationStatus,
				updatedAt,
			);

			return this.snapshotRecomputer.recomputeCascadeForMediaIds(
				[ mediaId ],
				updatedAt,
			);
		});
	}

	public setGroupIntegrationStatusAndCascade(
		groupId: number,
		integrationStatus: IntegrationStatus | null,
		groupingMode: UserGroupingMode,
	): IntegrationCascadeResultDto {
		const updatedAt = Date.now();
		return this.repository.runInTransaction(() => {
			this.repository.upsertGroupStateRow(
				groupId,
				integrationStatus,
				updatedAt,
				groupingMode,
			);

			const mediaIds = this.repository.getMediaIdsByGroupId(
				groupId,
				groupingMode,
			);
			mediaIds.forEach((mediaId) => this.snapshotRecomputer.updateMediaAndEpisodesIntegrationStatus(
				mediaId,
				integrationStatus,
				updatedAt,
			));

			return this.snapshotRecomputer.recomputeCascadeForMediaIds(
				mediaIds,
				updatedAt,
			);
		});
	}

	public recomputeGroupIntegrationSnapshotsForRefs(groups: GroupRef[]): void {
		const updatedAt = Date.now();
		this.repository.runInTransaction(() => {
			this.snapshotRecomputer.recomputeGroupIntegrationSnapshotsForRefs(
				groups,
				updatedAt,
			);
		});
	}
}

export function createUserIntegrationCascadeManager(): UserIntegrationCascadeManager {
	return new UserIntegrationCascadeManager(createUserIntegrationCascadeRepository());
}
