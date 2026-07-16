import type {
	ErroredContentItem,
	ErroredContentPage,
	ErroredContentQueue,
	HideErroredContentRequest,
} from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import {
	type FailedHydrationItemRow,
	toErroredContentItem,
} from "./failed-hydration-items-model";
import {
	STMT_COUNT_FAILED_ITEMS,
	STMT_SELECT_FAILED_ITEM_BY_KEY,
	STMT_SELECT_FAILED_ITEMS,
} from "./failed-hydration-items-read-statements";

// Reads persisted queue failures plus pending automatic retries. Resolved rows are
// excluded; pending retry rows stay visible so users know the app already plans
// another attempt and can optionally force a manual retry.
export function selectErroredContentPage(
	offset: number,
	limit: number,
	queue: ErroredContentQueue | null = null,
	includeHidden                     = false,
): ErroredContentPage {
	const db         = getDatabase();
	const hiddenFlag = includeHidden ? 1 : 0;
	const total      = db.prepare<[ ErroredContentQueue | null, ErroredContentQueue | null, number ], {
		total: number
	}>(STMT_COUNT_FAILED_ITEMS)
		.get(
			queue,
			queue,
			hiddenFlag,
		)?.total ?? 0;
	const items      = db.prepare<[ ErroredContentQueue | null, ErroredContentQueue | null, number, number, number ], FailedHydrationItemRow>(STMT_SELECT_FAILED_ITEMS)
		.all(
			queue,
			queue,
			hiddenFlag,
			limit,
			offset,
		)
		.map(toErroredContentItem);

	return {
		items,
		total,
		nextOffset: offset + items.length < total
									? offset + items.length
									: null,
	};
}

export function selectErroredContentItem(request: HideErroredContentRequest): ErroredContentItem | null {
	const db  = getDatabase();
	const row = db.prepare<[ ErroredContentQueue, number ], FailedHydrationItemRow>(STMT_SELECT_FAILED_ITEM_BY_KEY)
		.get(
			request.queue,
			request.mediaId,
		);

	return row ? toErroredContentItem(row) : null;
}
