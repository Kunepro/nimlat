import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import { ROUTES } from "../../constants/route-config";
import type { QueueFilter } from "../../types/errored-content";
import {
	createRouteHistoryState,
	type NimlatRouteHistoryStateUpdater,
} from "../../types/router-history-state";

export interface ErroredContentMediaNavigationTarget {
	params: { mediaId: string };
	state: NimlatRouteHistoryStateUpdater;
	to: typeof ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL;
}

export function getErroredContentQueueFilter(filter: QueueFilter): ErroredContentQueue | null {
	return filter === "all" ? null : filter;
}

export function formatErroredContentActionError(error: unknown, fallbackMessage: string): string {
	return error instanceof Error ? error.message : fallbackMessage;
}

export function addPendingActionKey(currentKeys: string[], actionKey: string): string[] {
	return Array.from(new Set([
		...currentKeys,
		actionKey,
	]));
}

export function removePendingActionKey(currentKeys: string[], actionKey: string): string[] {
	return currentKeys.filter(currentKey => currentKey !== actionKey);
}

export function getRetryAllSuccessMessage(retriedCount: number): string {
	return retriedCount === 0
		? "No retryable failed items found."
		: `Queued ${ retriedCount } item${ retriedCount === 1 ? "" : "s" } for retry.`;
}

export function getVisibleErroredContentItems(
	items: ErroredContentItem[],
	search: string,
): ErroredContentItem[] {
	const normalizedSearch = search.trim().toLowerCase();
	return [ ...items ]
		.filter(item => normalizedSearch.length === 0 || item.name.toLowerCase().includes(normalizedSearch))
		.sort((left, right) => left.name.localeCompare(
			right.name,
			undefined,
			{ sensitivity: "base" },
		));
}

export function mergeErroredContentPageItems(
	currentItems: ErroredContentItem[],
	nextItems: ErroredContentItem[],
	offset: number,
): ErroredContentItem[] {
	return offset === 0
		? nextItems
		: [
			...currentItems,
			...nextItems,
		];
}

export function createErroredContentMediaNavigationTarget(item: ErroredContentItem): ErroredContentMediaNavigationTarget {
	return {
		to:     ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL,
		params: { mediaId: item.mediaId.toString() },
		state:  createRouteHistoryState({ mediaName: item.name }),
	};
}
