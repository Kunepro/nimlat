import {
	ANILIST_API,
	StaffEdge,
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

const STAFF_RESULTS_PER_PAGE = 25;

interface StaffResponse {
	Media: {
		id: number;
		staff: {
			pageInfo: {
				total: number;
				perPage: number;
				currentPage: number;
				lastPage: number;
				hasNextPage: boolean;
			};
			edges: StaffEdge[];
		};
	} | null;
}

// Fetch all AniList staff pages for one provider-native media ID. The complete
// catalog payload deliberately omits paginated staff edges, so this enrichment
// mirrors character hydration and owns its own retryable lifecycle.
export class AniListStaffFetcher {
	public streamAllStaff(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Observable<AniListPagedFetchEvent<StaffEdge[]>> {
		return new Observable((subscriber) => {
			void this.emitAllStaff(
				mediaId,
				priority,
				context,
				subscriber,
			).catch((error: unknown) => {
				subscriber.error(error);
			});
		});
	}

	private async emitAllStaff(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext>,
		subscriber: Subscriber<AniListPagedFetchEvent<StaffEdge[]>>,
	): Promise<void> {
		let page        = 1;
		let hasNextPage = true;
		const staffEdges: StaffEdge[] = [];

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
				() => this.queryStaff(
					mediaId,
					page,
					STAFF_RESULTS_PER_PAGE,
				),
				priority,
				{
					operation: "staff-page",
					idAniList: mediaId,
					page,
					perPage:   STAFF_RESULTS_PER_PAGE,
					...context,
				},
			);
			if (subscriber.closed) {
				return;
			}

			const media = response.Media;
			if (!media) {
				throw new Error(`AniList returned no media for id ${ mediaId } while loading staff.`);
			}

			staffEdges.push(...media.staff.edges);
			hasNextPage = media.staff.pageInfo.hasNextPage;
			page += 1;
		}

		subscriber.next({
			kind:  "completed",
			items: staffEdges,
		});
		subscriber.complete();
	}

	private async queryStaff(
		mediaId: number,
		page: number,
		perPage: number = STAFF_RESULTS_PER_PAGE,
	): Promise<StaffResponse> {
		const query = `
    query ($id: Int, $page: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        id
        staff(page: $page, perPage: $perPage, sort: [RELEVANCE, ID]) {
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
            node {
              id
              name {
                first
                middle
                last
                full
                native
                alternative
              }
              language: languageV2
              image {
                large
                medium
              }
              description
              primaryOccupations
              gender
              dateOfBirth {
                year
                month
                day
              }
              dateOfDeath {
                year
                month
                day
              }
              age
              yearsActive
              homeTown
              bloodType
              siteUrl
            }
          }
        }
      }
    }
  `;

		return request<StaffResponse>(
			ANILIST_API,
			query,
			{
				id: mediaId,
				page,
				perPage,
			},
		);
	}
}
