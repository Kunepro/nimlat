import { logAniListCharactersPage } from "@nimlat/loggers/main";
import {
	ANILIST_API,
	AniListCharacter,
	CharacterEdge,
} from "@nimlat/types/ani-list-media-api";
import { request } from "graphql-request";
import {
	Observable,
	type Subscriber,
} from "rxjs";
import { AniListPagedFetchEvent } from "../ani-list-paged-fetch-events";
import {
	aniListRateLimiter,
	AniListRateLimiterPriority,
	AniListRateLimiterRequestContext,
} from "../ani-list.rate-limiter.singleton";

const CHARACTERS_RESULTS_PER_PAGE = 25;

interface CharactersResponse {
	Media: {
		id: number;
		idMal: number | null;
		characters: {
			pageInfo: {
				total: number;
				perPage: number;
				currentPage: number;
				lastPage: number;
				hasNextPage: boolean;
			};
			edges: CharacterEdge[];
		};
	} | null;
}

// Fetch all character pages for an AniList media via the rate limiter.
// API-layer helper: no logging, no toaster notifications, no UI side effects.
// Errors propagate to the caller so daemons/handlers decide how to log or display.
// Only call this through AniListAPI to avoid bypassing the limiter.
export class AniListCharactersFetcher {
	public streamAllCharacters(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Observable<AniListPagedFetchEvent<AniListCharacter[]>> {
		return new Observable((subscriber) => {
			void this.emitAllCharacters(
				mediaId,
				priority,
				context,
				subscriber,
			).catch((error: unknown) => {
				subscriber.error(error);
			});
		});
	}

	private async emitAllCharacters(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext>,
		subscriber: Subscriber<AniListPagedFetchEvent<AniListCharacter[]>>,
	): Promise<void> {
		// Any failed page throws and aborts the full fetch.
		let page                             = 1;
		let hasNextPage                      = true;
		const characters: AniListCharacter[] = [];

		while (hasNextPage) {
			if (subscriber.closed) {
				return;
			}

			subscriber.next({
				kind: "page-requested",
				page,
				hasNextPage,
			});
			const response = await aniListRateLimiter.enqueue(
				() => this.queryCharacters(
					mediaId,
					page,
					CHARACTERS_RESULTS_PER_PAGE,
				),
				priority,
				{
					operation: "characters-page",
					idAniList: mediaId,
					page,
					perPage:   CHARACTERS_RESULTS_PER_PAGE,
					...context,
				},
			);
			if (subscriber.closed) {
				return;
			}

			const media = response.Media;
			if (!media) {
				throw new Error(`AniList returned no media for id ${ mediaId } while loading characters.`);
			}

			const {
							characters: {
														pageInfo,
														edges,
													},
						} = media;

			characters.push(...this.mapCharacters(edges));
			hasNextPage = pageInfo.hasNextPage;
			page += 1;
		}

		subscriber.next({
			kind:  "completed",
			items: characters,
		});
		subscriber.complete();
	}

	private async queryCharacters(
		mediaId: number,
		page: number,
		perPage: number = CHARACTERS_RESULTS_PER_PAGE,
	): Promise<CharactersResponse> {
		const query = `
    query ($id: Int, $page: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        characters(page: $page, perPage: $perPage, sort: [ROLE, RELEVANCE, ID]) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          edges {
            id
            role
            name
            node {
              id
              name {
                first
                last
                full
                native
              }
              image {
                large
                medium
              }
            }
            voiceActors(sort: [RELEVANCE, ID]) {
              id
              name {
                first
                last
                full
                native
              }
              language: languageV2
              image {
                large
                medium
              }
            }
          }
        }
      }
    }
  `;

		const variables = {
			id: mediaId,
			page,
			perPage,
		};

		const response = await request<CharactersResponse>(
			ANILIST_API,
			query,
			variables,
		);
		logAniListCharactersPage(
			response,
			{
				mediaId,
				page,
				perPage,
			},
		);
		return response;
	}

	private mapCharacters(
		edges: CharacterEdge[],
	): AniListCharacter[] {
		return edges.map((edge) => ({
			id:    edge.node.id,
			name:  {
				full:   edge.node.name.full,
				native: edge.node.name.native,
			},
			image: edge.node.image,
			role:  edge.role ?? null,
			voiceActors: edge.voiceActors ?? [],
		}));
	}
}
