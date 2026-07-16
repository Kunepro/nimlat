import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	selectIncomingParentMediaRelations,
	selectIncomingSourceMediaRelations,
} from "./media-relations/get-media-relations-incoming";
import {
	selectOutgoingMediaRelations,
	selectOutgoingMediaRelationsByMediaIds,
	selectOutgoingNonParentMediaRelations,
	selectOutgoingParentMediaRelations,
} from "./media-relations/get-media-relations-outgoing";

// Relation read facade kept as a nested media panel because relation traversal
// is a distinct graph concern from media row inspection.
export const AnimeDbMediaRelationsFacade = {
	all(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.all",
			() => selectOutgoingMediaRelations(mediaId),
			{ mediaId },
		);
	},

	allByMediaIds(mediaIds: number[]) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.allByMediaIds",
			() => selectOutgoingMediaRelationsByMediaIds(mediaIds),
			{ mediaIds },
		);
	},

	parents(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.parents",
			() => selectOutgoingParentMediaRelations(mediaId),
			{ mediaId },
		);
	},

	nonParents(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.nonParents",
			() => selectOutgoingNonParentMediaRelations(mediaId),
			{ mediaId },
		);
	},

	children(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.children",
			() => selectIncomingParentMediaRelations(mediaId),
			{ mediaId },
		);
	},

	incomingSourceMedias(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.relations.incomingSourceMedias",
			() => selectIncomingSourceMediaRelations(mediaId),
			{ mediaId },
		);
	},
} as const;
