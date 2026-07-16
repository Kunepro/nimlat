import type {
	IntegrationCascadeResultDto,
	IntegrationStatus,
	UserGroupingMode,
} from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	collectUniqueNumbers,
	createAffectedGroupRefs,
	normalizeGroupRefs,
	resolveGroupingModeForGroupRef,
} from "./user-integration-cascade-policy";
import type { UserIntegrationCascadeRepository } from "./user-integration-cascade-repository";
import {
	getBaseIntegrationPercent,
	MAX_INTEGRATION_PERCENT_WITH_PLAYBACK_ISSUES,
	resolveGroupIntegrationStatusFromMediaStatuses,
	resolveMediaIntegrationStatusFromEpisodeStatuses,
	roundAverage,
} from "./user-integration-resolution";
import {
	hasPlaybackIssues,
	toNumberAsBooleanLiteral,
} from "./user-integration-state-helpers";

// Recomputes derived integration snapshots from persisted state. The cascade
// manager owns transaction boundaries and write intent; this service owns the
// order-safe aggregate rules for episode, media, and group snapshots.
export class UserIntegrationSnapshotRecomputer {
	public constructor(private readonly repository: UserIntegrationCascadeRepository) {}

	public updateMediaAndEpisodesIntegrationStatus(
		mediaId: number,
		integrationStatus: IntegrationStatus | null,
		updatedAt: number,
	): void {
		const currentMediaState = this.repository.getMediaStateRow(mediaId);
		this.repository.upsertMediaStateRow({
			mediaId,
			integrationStatus,
			playbackIssueNote: currentMediaState.playbackIssueNote,
			hasDubIssue:       toNumberAsBooleanLiteral(currentMediaState.hasDubIssue),
			hasSubIssue:       toNumberAsBooleanLiteral(currentMediaState.hasSubIssue),
			hasEncodingIssue:  toNumberAsBooleanLiteral(currentMediaState.hasEncodingIssue),
			hasAudioIssue:     toNumberAsBooleanLiteral(currentMediaState.hasAudioIssue),
			hasVideoIssue:     toNumberAsBooleanLiteral(currentMediaState.hasVideoIssue),
			updatedAt,
		});

		const episodeNumbers = this.repository.getEpisodeNumbersByMediaId(mediaId);
		episodeNumbers.forEach((episodeNumber) => {
			const currentEpisodeState = this.repository.getEpisodeStateRow(
				mediaId,
				episodeNumber,
			);
			this.repository.upsertEpisodeStateRow({
				mediaId,
				episodeNumber,
				integrationStatus,
				playbackIssueNote: currentEpisodeState.playbackIssueNote,
				hasDubIssue:       toNumberAsBooleanLiteral(currentEpisodeState.hasDubIssue),
				hasSubIssue:       toNumberAsBooleanLiteral(currentEpisodeState.hasSubIssue),
				hasEncodingIssue:  toNumberAsBooleanLiteral(currentEpisodeState.hasEncodingIssue),
				hasAudioIssue:     toNumberAsBooleanLiteral(currentEpisodeState.hasAudioIssue),
				hasVideoIssue:     toNumberAsBooleanLiteral(currentEpisodeState.hasVideoIssue),
				updatedAt,
			});
			this.recomputeEpisodeIntegration(
				mediaId,
				episodeNumber,
				updatedAt,
			);
		});
	}

	public syncMediaStatusFromEpisodeStates(mediaId: number, updatedAt: number): void {
		// Episode-level edits are not bulk actions. They must not mutate sibling
		// episodes, but the parent media still needs an explicit status that
		// matches the effective episode selection:
		// - ignored/untracked episodes do not participate in progress
		// - tracked-or-above episodes choose the lowest active phase
		// - all ignored episodes keep the media ignored
		// - any untracked episode with no active tracked phases makes media untracked
		const currentMediaState = this.repository.getMediaStateRow(mediaId);
		this.repository.upsertMediaStateRow({
			mediaId,
			integrationStatus: resolveMediaIntegrationStatusFromEpisodeStatuses(
				this.repository.getEpisodeIntegrationStatusesByMediaId(mediaId),
			),
			playbackIssueNote: currentMediaState.playbackIssueNote,
			hasDubIssue:       toNumberAsBooleanLiteral(currentMediaState.hasDubIssue),
			hasSubIssue:       toNumberAsBooleanLiteral(currentMediaState.hasSubIssue),
			hasEncodingIssue:  toNumberAsBooleanLiteral(currentMediaState.hasEncodingIssue),
			hasAudioIssue:     toNumberAsBooleanLiteral(currentMediaState.hasAudioIssue),
			hasVideoIssue:     toNumberAsBooleanLiteral(currentMediaState.hasVideoIssue),
			updatedAt,
		});
	}

	public recomputeEpisodeIntegration(
		mediaId: number,
		episodeNumber: number,
		updatedAt: number,
	): number | null {
		const episodeState                  = this.repository.getEpisodeStateRow(
			mediaId,
			episodeNumber,
		);
		const mediaState                    = this.repository.getMediaStateRow(mediaId);
		const playbackIssueMomentCount      = this.repository.countEpisodePlaybackIssueMoments(
			mediaId,
			episodeNumber,
		);
		const mediaPlaybackIssueMomentCount = this.repository.countMediaPlaybackIssueMoments(mediaId);
		let integrationPercent              = getBaseIntegrationPercent(episodeState.integrationStatus);

		if (integrationPercent !== null && (
			hasPlaybackIssues(
				episodeState,
				playbackIssueMomentCount,
			)
			|| hasPlaybackIssues(
				mediaState,
				mediaPlaybackIssueMomentCount,
			)
		)) {
			integrationPercent = Math.min(
				integrationPercent,
				MAX_INTEGRATION_PERCENT_WITH_PLAYBACK_ISSUES,
			);
		}

		this.repository.upsertEpisodeIntegrationSnapshot(
			mediaId,
			episodeNumber,
			integrationPercent,
			updatedAt,
		);

		return integrationPercent;
	}

	public recomputeMediaIntegration(
		mediaId: number,
		updatedAt: number,
	): number | null {
		const episodeIntegrationPercents    = this.repository.getEpisodeIntegrationPercentsByMediaId(mediaId);
		const mediaState                    = this.repository.getMediaStateRow(mediaId);
		const mediaPlaybackIssueMomentCount = this.repository.countMediaPlaybackIssueMoments(mediaId);
		let integrationPercent              = roundAverage(episodeIntegrationPercents);
		if (integrationPercent === null) {
			integrationPercent = getBaseIntegrationPercent(mediaState.integrationStatus);
		}

		if (integrationPercent !== null && hasPlaybackIssues(
			mediaState,
			mediaPlaybackIssueMomentCount,
		)) {
			integrationPercent = Math.min(
				integrationPercent,
				MAX_INTEGRATION_PERCENT_WITH_PLAYBACK_ISSUES,
			);
		}

		this.repository.upsertMediaIntegrationSnapshot(
			mediaId,
			integrationPercent,
			updatedAt,
		);

		return integrationPercent;
	}

	public recomputeGroupIntegration(
		groupId: number,
		updatedAt: number,
		groupingMode: UserGroupingMode,
	): void {
		const mediaIntegrationPercents = this.repository.getMediaIntegrationPercentsByGroupId(
			groupId,
			groupingMode,
		);
		const integrationPercent       = roundAverage(mediaIntegrationPercents);
		const integrationStatus        = resolveGroupIntegrationStatusFromMediaStatuses(
			this.repository.getMediaIntegrationStatusesByGroupId(
				groupId,
				groupingMode,
			),
		);
		this.repository.upsertGroupIntegrationSnapshot(
			groupId,
			integrationPercent,
			updatedAt,
			groupingMode,
		);

		// Group status is derived from child media status, not from the percent snapshot:
		// ignored and untracked media are excluded from the active integration phase,
		// while tracked-or-above media choose the lowest phase to avoid overstating
		// a mixed group such as tracked + downloaded.
		this.repository.upsertGroupStateRow(
			groupId,
			integrationStatus,
			updatedAt,
			groupingMode,
		);
	}

	public recomputeCascadeForMediaIds(
		mediaIds: number[],
		updatedAt: number,
	): IntegrationCascadeResultDto {
		const affectedMediaIds = collectUniqueNumbers(mediaIds);
		this.recomputeMediaIntegrations(
			affectedMediaIds,
			updatedAt,
		);

		const affectedAnimeGroupIds = this.collectAffectedGroupIds(
			affectedMediaIds,
			"anime",
		);
		const affectedUserGroupIds  = this.collectAffectedGroupIds(
			affectedMediaIds,
			"user",
		);
		this.recomputeGroupIntegrations(
			affectedAnimeGroupIds,
			updatedAt,
			"anime",
		);
		this.recomputeGroupIntegrations(
			affectedUserGroupIds,
			updatedAt,
			"user",
		);

		return {
			affectedMediaIds,
			affectedGroups: createAffectedGroupRefs(
				affectedAnimeGroupIds,
				affectedUserGroupIds,
			),
		};
	}

	public recomputeGroupIntegrationSnapshotsForRefs(groups: GroupRef[], updatedAt: number): void {
		normalizeGroupRefs(groups).forEach((group) => {
			const groupingMode = resolveGroupingModeForGroupRef(group);
			if (!this.repository.groupExists(
				group.groupId,
				groupingMode,
			)) {
				return;
			}

			this.recomputeGroupIntegration(
				group.groupId,
				updatedAt,
				groupingMode,
			);
		});
	}

	private collectAffectedGroupIds(mediaIds: number[], groupingMode: UserGroupingMode): number[] {
		return collectUniqueNumbers(mediaIds.flatMap((mediaId) => this.repository.getGroupIdsByMediaId(
			mediaId,
			groupingMode,
		)));
	}

	// Recompute direct media snapshots before parent group aggregates are refreshed.
	private recomputeMediaIntegrations(
		mediaIds: number[],
		updatedAt: number,
	): void {
		mediaIds.forEach((mediaId) => {
			this.recomputeMediaIntegration(
				mediaId,
				updatedAt,
			);
		});
	}

	// Recompute parent group percent and status snapshots after all affected media snapshots are current.
	private recomputeGroupIntegrations(
		groupIds: number[],
		updatedAt: number,
		groupingMode: UserGroupingMode,
	): void {
		groupIds.forEach((groupId) => {
			this.recomputeGroupIntegration(
				groupId,
				updatedAt,
				groupingMode,
			);
		});
	}
}
