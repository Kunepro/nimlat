import { RetryErroredContentRequest } from "@nimlat/types/ipc-payloads";
import { retryAllErroredContentQueueItems } from "./failed-hydration-items-commands";

// Preserve the public facade signature while keeping request-shaping beside the
// errored-content DB operations that own retry eligibility.
export function retryAllErroredContentByQueue(queue: RetryErroredContentRequest["queue"] | null): number {
	return retryAllErroredContentQueueItems({ queue });
}
