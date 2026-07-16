import type {
	PastReleaseWatchPage,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchPage,
} from "@nimlat/types/release-watch";
import {
	createPastReleaseWatchPage,
	createUpcomingReleaseWatchPage,
} from "./release-watch-page-model";
import { selectCatalogReleaseWatchRows } from "./select-catalog-release-watch-rows";
import { selectScopedReleaseWatchRows } from "./select-scoped-release-watch-rows";
import type { ReleaseWatchStateRow } from "./user-release-watch-shared";

function selectReleaseWatchRows(
	watchDomain: "past" | "upcoming",
	scope: ReleaseWatchScopeFilter,
	offset: number,
	limit: number,
): {
	rows: ReleaseWatchStateRow[];
	total: number;
} {
	if (scope === "all") {
		return selectCatalogReleaseWatchRows(
			watchDomain,
			offset,
			limit,
		);
	}

	return selectScopedReleaseWatchRows(
		watchDomain,
		offset,
		limit,
	);
}

export function selectPastReleaseWatchPage(
	scope: ReleaseWatchScopeFilter,
	offset: number,
	limit: number,
): PastReleaseWatchPage {
	const result = selectReleaseWatchRows(
		"past",
		scope,
		offset,
		limit,
	);

	return createPastReleaseWatchPage(
		result.rows,
		result.total,
		offset,
	);
}

export function selectUpcomingReleaseWatchPage(
	scope: ReleaseWatchScopeFilter,
	offset: number,
	limit: number,
): UpcomingReleaseWatchPage {
	const result = selectReleaseWatchRows(
		"upcoming",
		scope,
		offset,
		limit,
	);

	return createUpcomingReleaseWatchPage(
		result.rows,
		result.total,
		offset,
	);
}
