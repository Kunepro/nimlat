import {
	GroupBlueprintDto,
	MediaCoverImageParsedJson,
} from "@nimlat/types/anime-db";
import { MediaBlueprintRaw } from "./types/media-blueprint-raw";

export function mapMediaBlueprintToGroupBlueprintDto(raw: MediaBlueprintRaw): Omit<GroupBlueprintDto, "id"> {
	const image = safeParseCoverImage(raw.coverImageJson);

	return {
		name:        raw.name,
		description: raw.description,
		baseMediaId: raw.mediaId,
		imageUrl:    raw.customImageUrl || image?.extraLarge || image?.large || image?.medium || undefined,
	};
}

function safeParseCoverImage(json: string | undefined): MediaCoverImageParsedJson | undefined {
	try {
		return json ? JSON.parse(json) : undefined;
	} catch {
		return undefined;
	}
}


