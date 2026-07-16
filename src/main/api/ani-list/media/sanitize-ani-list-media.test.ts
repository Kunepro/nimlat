import type {
	AniListMedia,
	PagedResponse,
} from "@nimlat/types/ani-list-media-api";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	sanitizeAniListMedia,
	sanitizeAniListPagedMediasResponse,
} from "./sanitize-ani-list-media";

describe(
	"sanitizeAniListMedia",
	() => {
		it(
			"strips html tags and decodes entities from media descriptions",
			() => {
				const media: AniListMedia = {
					id:          1,
					idMal:       2,
					description: "The <i>last</i><br>episode &amp; finale&#33;",
				};

				expect(sanitizeAniListMedia(media).description).toBe("The last episode & finale!");
			},
		);

		it(
			"decodes named typography entities from provider descriptions",
			() => {
				const media: AniListMedia = {
					id:    1,
					idMal: 2,
					description: "Photos from &ldquo;Dune Mode&rdquo;&nbsp;&mdash; UEDA&rsquo;s pre/post-war series&hellip;",
				};

				expect(sanitizeAniListMedia(media).description).toBe("Photos from “Dune Mode” — UEDA’s pre/post-war series…");
			},
		);

		it(
			"sanitizes tag descriptions without mutating the original payload",
			() => {
				const media: AniListMedia = {
					id:    1,
					idMal: 2,
					tags:  [
						{
							id:          10,
							name:        "Drama",
							description: "Heavy <b>themes</b> &amp; tension",
						},
					],
				};

				const sanitizedMedia = sanitizeAniListMedia(media);

				expect(sanitizedMedia.tags?.[ 0 ].description).toBe("Heavy themes & tension");
				expect(media.tags?.[ 0 ].description).toBe("Heavy <b>themes</b> &amp; tension");
			},
		);

		it(
			"sanitizes relation-node descriptions without mutating the original payload",
			() => {
				const media: AniListMedia = {
					id:        1,
					idMal:     2,
					relations: {
						edges: [
							{
								relationType: "SEQUEL",
								node:         {
									id:          3,
									idMal:       4,
									description: "A <i>related</i><br>entry &amp; follow-up",
								},
							},
						],
					},
				};

				const sanitizedMedia = sanitizeAniListMedia(media);

				expect(sanitizedMedia.relations?.edges?.[ 0 ].node.description).toBe("A related entry & follow-up");
				expect(media.relations?.edges?.[ 0 ].node.description).toBe("A <i>related</i><br>entry &amp; follow-up");
			},
		);

		it(
			"normalizes blank descriptions to null",
			() => {
				const media: AniListMedia = {
					id:          1,
					idMal:       2,
					description: "<br><br>",
				};

				expect(sanitizeAniListMedia(media).description).toBeNull();
			},
		);
	},
);

describe(
	"sanitizeAniListPagedMediasResponse",
	() => {
		it(
			"sanitizes every media item in the paged response",
			() => {
				const response: PagedResponse<AniListMedia> = {
					Page: {
						pageInfo: {
							total:       1,
							perPage:     25,
							currentPage: 1,
							lastPage:    1,
							hasNextPage: false,
						},
						media:    [
							{
								id:          1,
								idMal:       2,
								description: "A &#x3C;literal&#x3E; <i>tagged</i> line",
							},
						],
					},
				};

				expect(sanitizeAniListPagedMediasResponse(response).Page.media[ 0 ].description).toBe("A <literal> tagged line");
			},
		);
	},
);
