import { AnimeDbFacade } from "@nimlat/database";
import { handleReferencedAsParent } from "./step-1-handle-referenced-as-parent";
import { handleParentRelations } from "./step-2-handle-parent-relations";
import { handleNonParentRelations } from "./step-3-handle-non-parent-relations";

// Automated grouping strategy for freshly ingested AniList relation rows.
// This is local post-upsert work, not network hydration: AniList relation data
// is already present in anime_data.mediaRelations before this function runs.
// Manual local user edits use dedicated IPC handlers and write unofficial links.
//
// For a given Media:
// 1. If it is referenced as a PARENT by any other Media -> create a Group using its name
//    and include itself in the Group (even if not in any relation itself).
// 2. If it has one or more PARENTs -> create (if necessary) one Group for each parent Media
//    and assign the Media to all these Groups.
// 3. If it has other relations but no PARENTs -> group the Media with related titles
//    under a deterministic Group based on lowest AniList id.
// 4. If it has no relations at all -> leave the Media orphaned so Library can show it directly.
export function computeGroupsForNewMedia(mediaId: number): void {
	const parents    = AnimeDbFacade.media.relations.parents(mediaId);
	const nonParents = AnimeDbFacade.media.relations.nonParents(mediaId);
	const children   = AnimeDbFacade.media.relations.children(mediaId);

	if (children.length > 0) {
		handleReferencedAsParent(
			mediaId,
			children,
		);
	}

	if (parents.length > 0) {
		handleParentRelations(
			mediaId,
			parents,
		);
		return;
	}

	if (nonParents.length > 0) {
		handleNonParentRelations(
			mediaId,
			nonParents,
		);
		return;
	}

}
