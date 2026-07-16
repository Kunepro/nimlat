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
import { createUserIntegrationCascadeManager } from "./user-integration-cascade-manager";
import { resolveGroupingModeForGroupRef } from "./user-integration-cascade-policy";

export {
	resolveGroupIntegrationStatusFromMediaStatuses,
	resolveMediaIntegrationStatusFromEpisodeStatuses,
} from "./user-integration-resolution";

// Public operation wrappers stay here to preserve the long-lived module boundary.
// The cascade manager owns transaction internals; callers only receive intention-named entry points.
export function replaceUserEpisodeStateAndCascade(
	state: UserEpisodeStateDto,
	playbackIssueMoments: UserEpisodePlaybackIssueMomentDto[],
): IntegrationCascadeResultDto {
	return createUserIntegrationCascadeManager().replaceEpisodeStateAndCascade(
		state,
		playbackIssueMoments,
	);
}

export function replaceUserMediaStateAndCascade(
	state: UserMediaStateRowDto,
	playbackIssueMoments: UserMediaPlaybackIssueMomentRowDto[] = [],
): IntegrationCascadeResultDto {
	return createUserIntegrationCascadeManager().replaceMediaStateAndCascadeWithMoments(
		state,
		playbackIssueMoments,
	);
}

export function setEpisodeIntegrationStatusAndCascade(
	mediaId: number,
	episodeNumber: number,
	integrationStatus: IntegrationStatus | null,
): IntegrationCascadeResultDto {
	return createUserIntegrationCascadeManager().setEpisodeIntegrationStatusAndCascade(
		mediaId,
		episodeNumber,
		integrationStatus,
	);
}

export function setMediaIntegrationStatusAndCascade(
	mediaId: number,
	integrationStatus: IntegrationStatus | null,
): IntegrationCascadeResultDto {
	return createUserIntegrationCascadeManager().setMediaIntegrationStatusAndCascade(
		mediaId,
		integrationStatus,
	);
}

function setGroupIntegrationStatusAndCascade(
	groupId: number,
	integrationStatus: IntegrationStatus | null,
	groupingMode: UserGroupingMode = "anime",
): IntegrationCascadeResultDto {
	return createUserIntegrationCascadeManager().setGroupIntegrationStatusAndCascade(
		groupId,
		integrationStatus,
		groupingMode,
	);
}

// Renderer-facing group references carry UI source names; cascade operations persist
// using grouping modes, so the adapter lives in the operation layer instead of facades.
export function setGroupRefIntegrationStatusAndCascade(
	group: GroupRef,
	integrationStatus: IntegrationStatus | null,
): IntegrationCascadeResultDto {
	return setGroupIntegrationStatusAndCascade(
		group.groupId,
		integrationStatus,
		resolveGroupingModeForGroupRef(group),
	);
}

// Membership-only mutations need group snapshots refreshed without changing child media state.
export function recomputeGroupIntegrationSnapshotsForGroupRefs(groups: GroupRef[]): void {
	createUserIntegrationCascadeManager().recomputeGroupIntegrationSnapshotsForRefs(groups);
}
