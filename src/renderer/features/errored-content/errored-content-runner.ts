import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import { HydratorFacade } from "../../facades";

// Shared renderer command/read surface for failed hydration content. Hooks own
// paging and busy indicators; this runner owns hydrator facade calls and payloads.
export function listErroredContentPage(
	offset: number,
	limit: number,
	queue: ErroredContentQueue | null,
	includeHidden: boolean,
) {
	return HydratorFacade.listErroredContent(
		offset,
		limit,
		queue,
		includeHidden,
	);
}

export function subscribeToErroredContentQueueChanges(onChange: () => void) {
	return HydratorFacade.queueChanges().subscribe(onChange);
}

export function retryErroredContentItem(item: ErroredContentItem) {
	return HydratorFacade.retryErroredContent({
		queue:   item.queue,
		mediaId: item.mediaId,
	});
}

export function retryAllErroredContentItems(queue: ErroredContentQueue | null) {
	return HydratorFacade.retryAllErroredContent(queue);
}

export function hideErroredContentItem(item: ErroredContentItem) {
	return HydratorFacade.hideErroredContent({
		queue:   item.queue,
		mediaId: item.mediaId,
	});
}

export function reportErroredContentItem(item: ErroredContentItem) {
	return HydratorFacade.reportErroredContent({
		queue:   item.queue,
		mediaId: item.mediaId,
	});
}
