import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { getMediaName } from "./media-hydration/media-name";
import { selectMediaMalId } from "./media/select-media-mal-id";

// Small hydration support panel for media labels/provider IDs used by daemons.
export const AnimeDbHydrationMediaFacade = {
	getMediaName(mediaId: number): string {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediaName",
			() => getMediaName(mediaId),
			{ mediaId },
		);
	},

	getMediaMalId(mediaId: number): number | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediaMalId",
			() => selectMediaMalId(mediaId),
			{ mediaId },
		);
	},
} as const;
