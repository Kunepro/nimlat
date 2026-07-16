import type {
	IntegrationCascadeResultDto,
	IntegrationStatus,
	UserEpisodePlaybackIssueMomentDto,
	UserEpisodeStateDto,
	UserMediaPlaybackIssueMomentRowDto,
	UserMediaStateRowDto,
} from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { selectIgnoredMediaIds } from "./integration/select-ignored-media-ids";
import { selectAllTrackedMediaIds } from "./integration/select-tracked-media-ids";
import {
	recomputeGroupIntegrationSnapshotsForGroupRefs,
	replaceUserEpisodeStateAndCascade,
	replaceUserMediaStateAndCascade,
	setEpisodeIntegrationStatusAndCascade,
	setGroupRefIntegrationStatusAndCascade,
	setMediaIntegrationStatusAndCascade,
} from "./integration/user-integration-state";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Integration state owns completion/progress cascades in user_data. Keep the cascade rules
// inside DB operations; this facade panel only names the externally consumed controls.
export const UserDbIntegrationFacade = {
	episode:               {
		setStatus: (
								 mediaId: number,
			           episodeNumber: number,
			           integrationStatus: IntegrationStatus | null,
							 ): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.episode.setStatus",
				() => setEpisodeIntegrationStatusAndCascade(
					mediaId,
					episodeNumber,
					integrationStatus,
				),
				{
					mediaId,
					episodeNumber,
					integrationStatus,
				},
			);
		},

		saveState: (
								 state: UserEpisodeStateDto,
			           playbackIssueMoments: UserEpisodePlaybackIssueMomentDto[],
							 ): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.episode.saveState",
				() => replaceUserEpisodeStateAndCascade(
					state,
					playbackIssueMoments,
				),
				{
					mediaId:                   state.mediaId,
					episodeNumber:             state.episodeNumber,
					playbackIssueMomentsCount: playbackIssueMoments.length,
				},
			);
		},
	},
	media:                 {
		setStatus: (
								 mediaId: number,
			           integrationStatus: IntegrationStatus | null,
							 ): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.media.setStatus",
				() => setMediaIntegrationStatusAndCascade(
					mediaId,
					integrationStatus,
				),
				{
					mediaId,
					integrationStatus,
				},
			);
		},

		saveState: (state: UserMediaStateRowDto): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.media.saveState",
				() => replaceUserMediaStateAndCascade(state),
				{
					mediaId:           state.mediaId,
					integrationStatus: state.integrationStatus,
				},
			);
		},

		saveStateWithMoments: (
														state: UserMediaStateRowDto,
			                      playbackIssueMoments: UserMediaPlaybackIssueMomentRowDto[],
													): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.media.saveStateWithMoments",
				() => replaceUserMediaStateAndCascade(
					state,
					playbackIssueMoments,
				),
				{
					mediaId:                   state.mediaId,
					playbackIssueMomentsCount: playbackIssueMoments.length,
				},
			);
		},
	},
	group:                 {
		recomputeSnapshotsForGroupRefs: (groups: GroupRef[]): void => {
			runUserDbFacadeOperation(
				"user-db.facade.integration.group.recomputeSnapshotsForGroupRefs",
				() => recomputeGroupIntegrationSnapshotsForGroupRefs(groups),
				{ groups },
			);
		},

		setStatusForGroupRef: (
														group: GroupRef,
			                      integrationStatus: IntegrationStatus | null,
													): IntegrationCascadeResultDto => {
			return runUserDbFacadeOperation(
				"user-db.facade.integration.group.setStatusForGroupRef",
				() => setGroupRefIntegrationStatusAndCascade(
					group,
					integrationStatus,
				),
				{
					group,
					integrationStatus,
				},
			);
		},
	},
	getAllTrackedMediaIds: (): number[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.integration.getAllTrackedMediaIds",
			() => selectAllTrackedMediaIds(),
		);
	},
	getIgnoredMediaIds:    (mediaIds: number[]): number[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.integration.getIgnoredMediaIds",
			() => selectIgnoredMediaIds(mediaIds),
			{ mediaIds },
		);
	},
} as const;
