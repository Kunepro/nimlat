import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import type { MediaInspectionGroupCard } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { ImageCacheService } from "../image-cache/image-cache-service";

// Media inspection surfaces the groups that contain one media without loading
// a full group inspection payload. Keep this bounded to one media id.
export function listMediaInspectionGroups(mediaId: number, groupSource?: GroupRef["source"]): MediaInspectionGroupCard[] {
	const sources: Array<GroupRef["source"]> = groupSource
		? [ groupSource ]
		: [
			"official",
			"user",
		];

	return sources.flatMap((source) => {
		const summaries = source === "official"
			? AnimeDbFacade.group.getSummariesByMediaIds([ mediaId ])
			: UserDbFacade.grouping.getSummariesByMediaIds([ mediaId ]);

		return summaries.map((summary) => ({
			source,
			groupId:  summary.groupId,
			name:     summary.name,
			imageUrl: summary.imageUrl,
			...ImageCacheService.resolveGroupDisplayImage(
				{
					source,
					groupId: summary.groupId,
				},
				summary.imageUrl ?? undefined,
			),
		}));
	});
}
