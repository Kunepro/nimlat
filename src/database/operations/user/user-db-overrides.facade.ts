import type {
	UserEpisodeOverrideDto,
	UserGroupOverrideDto,
	UserMediaOverrideRowDto,
} from "@nimlat/types/anime-db";
import {
	deleteUserEpisodeOverride,
	deleteUserGroupOverride,
	deleteUserMediaOverride,
	saveUserEpisodeOverride,
	saveUserGroupOverride,
	saveUserMediaOverride,
	selectUserEpisodeOverride,
	selectUserGroupOverride,
	selectUserMediaOverride,
} from "./overrides/user-metadata-overrides";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Sparse metadata overrides live in user_data so editable local labels/images never mutate anime_data.
export const UserDbOverridesFacade = {
	group:   {
		save: (override: UserGroupOverrideDto): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.group.save",
				() => saveUserGroupOverride(override),
				{ animeGroupId: override.animeGroupId },
			);
		},

		delete: (animeGroupId: number): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.group.delete",
				() => deleteUserGroupOverride(animeGroupId),
				{ animeGroupId },
			);
		},

		get: (animeGroupId: number): UserGroupOverrideDto | null => {
			return runUserDbFacadeOperation(
				"user-db.facade.overrides.group.get",
				() => selectUserGroupOverride(animeGroupId),
				{ animeGroupId },
			);
		},
	},
	media:   {
		save: (override: UserMediaOverrideRowDto): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.media.save",
				() => saveUserMediaOverride(override),
				{ mediaId: override.mediaId },
			);
		},

		delete: (mediaId: number): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.media.delete",
				() => deleteUserMediaOverride(mediaId),
				{ mediaId },
			);
		},

		get: (mediaId: number): UserMediaOverrideRowDto | null => {
			return runUserDbFacadeOperation(
				"user-db.facade.overrides.media.get",
				() => selectUserMediaOverride(mediaId),
				{ mediaId },
			);
		},
	},
	episode: {
		saveMetadata: (override: UserEpisodeOverrideDto): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.episode.saveMetadata",
				() => saveUserEpisodeOverride(override),
				{
					mediaId:       override.mediaId,
					episodeNumber: override.episodeNumber,
				},
			);
		},

		deleteMetadata: (mediaId: number, episodeNumber: number): void => {
			runUserDbFacadeOperation(
				"user-db.facade.overrides.episode.deleteMetadata",
				() => deleteUserEpisodeOverride(
					mediaId,
					episodeNumber,
				),
				{
					mediaId,
					episodeNumber,
				},
			);
		},

		getMetadata: (mediaId: number, episodeNumber: number): UserEpisodeOverrideDto | null => {
			return runUserDbFacadeOperation(
				"user-db.facade.overrides.episode.getMetadata",
				() => selectUserEpisodeOverride(
					mediaId,
					episodeNumber,
				),
				{
					mediaId,
					episodeNumber,
				},
			);
		},
	},
} as const;
