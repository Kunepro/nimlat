import { LibrarySelectionInput } from "@nimlat/types/ipc-payloads";
import { GroupReadRepository } from "../group/group-read-repository";

/**
 * Expand mixed Library selections into canonical media ids in main so renderer code
 * does not own DB-backed group-membership resolution.
 */
export function resolveLibrarySelectionMediaIds(items: LibrarySelectionInput[]): number[] {
	const mediaIds = new Set<number>();

	items.forEach((item) => {
		if (item.kind === "media") {
			mediaIds.add(item.mediaId);
			return;
		}

		GroupReadRepository.getMediaIdsByRef(item.group).forEach((mediaId) => {
			mediaIds.add(mediaId);
		});
	});

	return Array.from(mediaIds);
}
