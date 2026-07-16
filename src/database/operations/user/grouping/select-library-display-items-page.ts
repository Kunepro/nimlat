import type {
	LibraryDisplayFilters,
	LibraryDisplayItemsPage,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import {
	createLibraryDisplayQueryArgs,
	createLibraryDisplayQueryInput,
	type LibraryDisplayItemRow,
	mapLibraryDisplayRows,
} from "./library-display-items-model";
import {
	LIBRARY_DISPLAY_ITEMS_COUNT_SQL,
	LIBRARY_DISPLAY_ITEMS_PAGE_SQL,
} from "./library-display-items-query-sql";

// The Library read applies the current adult-content preference directly in SQL so every refresh
// sees the same filtered view without renderer-side post-processing.
//
// Grouped/raw-media visibility is still derived from real membership tables instead of a
// denormalized flag because grouping mutations can change that relationship outside this query.
export function selectLibraryDisplayItemsPage(
	offset: number,
	limit: number,
	search: string,
	scope: LibraryDisplayScope              = "library",
	filters: Partial<LibraryDisplayFilters> = {},
): LibraryDisplayItemsPage {
	const queryInput = createLibraryDisplayQueryInput(
		search,
		filters,
	);
	const queryArgs  = createLibraryDisplayQueryArgs(
		scope,
		queryInput,
	);
	const db         = getDatabase();
	const total      = (db.prepare(LIBRARY_DISPLAY_ITEMS_COUNT_SQL).get(...queryArgs) as { total: number }).total;
	const rows       = db.prepare(LIBRARY_DISPLAY_ITEMS_PAGE_SQL).all(
		...queryArgs,
		limit,
		offset,
	) as LibraryDisplayItemRow[];

	const items = mapLibraryDisplayRows(rows);
	const nextOffset = offset + items.length < total ? offset + items.length : null;

	return {
		items,
		nextOffset,
		total,
	};
}
