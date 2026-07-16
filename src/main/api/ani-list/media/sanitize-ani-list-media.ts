import {
	AniListMedia,
	MediaTag,
	PagedResponse,
} from "@nimlat/types/ani-list-media-api";
import { decodeHTML } from "entities";

const HTML_BREAK_TAG_REGEX = /<br\s*\/?>/gi;
const HTML_TAG_REGEX       = /<[^>]*>/g;

// Normalize AniList HTML descriptions into plain text at the API boundary.
// This keeps downstream DB writes, IPC payloads, and renderer lists free from raw external markup.
export function sanitizeAniListPagedMediasResponse(
	response: PagedResponse<AniListMedia>,
): PagedResponse<AniListMedia> {
	return {
		Page: {
			...response.Page,
			media: response.Page.media.map(sanitizeAniListMedia),
		},
	};
}

// Create a sanitized copy of a medias payload so callers never process raw AniList HTML.
export function sanitizeAniListMedia(media: AniListMedia): AniListMedia {
	return {
		...media,
		description: sanitizeAniListDescription(media.description),
		tags:        media.tags?.map(sanitizeAniListTag) || media.tags,
		relations:   media.relations
									 ? {
				...media.relations,
				edges: media.relations.edges?.map((edge) => ({
					...edge,
					node: {
						...edge.node,
						description: sanitizeAniListDescription(edge.node.description),
					},
				})) || media.relations.edges,
			}
									 : media.relations,
	};
}

function sanitizeAniListTag(tag: MediaTag): MediaTag {
	return {
		...tag,
		description: sanitizeAniListDescription(tag.description),
	};
}

function sanitizeAniListDescription(description?: string | null): string | null | undefined {
	if (description == null) {
		return description;
	}

	const plainText = decodeHTML(
		description
			.replace(
				HTML_BREAK_TAG_REGEX,
				" ",
			)
			.replace(
				HTML_TAG_REGEX,
				"",
			),
	)
		.replace(
			/\s+/g,
			" ",
		)
		.trim();

	return plainText || null;
}
