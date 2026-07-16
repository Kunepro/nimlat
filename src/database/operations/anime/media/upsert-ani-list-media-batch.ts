import { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { upsertAniListMedia } from "./upsert-ani-list-media";

// Batch import intentionally preserves the single-media transaction/queue
// lifecycle so one bad payload does not obscure which item failed.
export function upsertAniListMediaBatch(medias: AniListMedia[]): void {
	medias.forEach(media => upsertAniListMedia(media));
}
