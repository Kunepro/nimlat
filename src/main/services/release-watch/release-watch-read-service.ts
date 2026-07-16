import { UserDbFacade } from "@nimlat/database";
import type {
	PastReleaseWatchPage,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchPage,
} from "@nimlat/types/release-watch";

const DEFAULT_LIMIT = 50;

// UI-facing release-watch read facade. Persistence and orchestration stay in DB
// operations and ReleaseWatchCoordinator so IPC remains a thin boundary.
export class ReleaseWatchReadService {
	public static listPast(
		scope: ReleaseWatchScopeFilter = "tracked",
		limit: number                  = DEFAULT_LIMIT,
		offset: number                 = 0,
	): PastReleaseWatchPage {
		return UserDbFacade.releaseWatch.listPast(
			scope,
			offset,
			limit,
		);
	}

	public static listUpcoming(
		scope: ReleaseWatchScopeFilter = "tracked",
		limit: number                  = DEFAULT_LIMIT,
		offset: number                 = 0,
	): UpcomingReleaseWatchPage {
		return UserDbFacade.releaseWatch.listUpcoming(
			scope,
			offset,
			limit,
		);
	}

}
