import type { ErroredContentQueue } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../hooks";
import { retryAllErroredContentItems } from "../errored-content-runner";
import {
	formatErroredContentActionError,
	getRetryAllSuccessMessage,
} from "../errored-content-state-model";

interface UseErroredContentRetryAllActionInput {
	queue: ErroredContentQueue | null;
	loadPage: (offset?: number) => Promise<void>;
}

interface UseErroredContentRetryAllActionResult {
	isRetryingAll: boolean;
	retryAll: () => Promise<void>;
}

// Bulk retry has page-level busy state, separate from row-level pending actions.
export function useErroredContentRetryAllAction({
																									queue,
																									loadPage,
																								}: UseErroredContentRetryAllActionInput): UseErroredContentRetryAllActionResult {
	const messageApi                          = useAppMessage();
	const [ isRetryingAll, setIsRetryingAll ] = useState(false);

	const retryAll = useCallback(
		async (): Promise<void> => {
			setIsRetryingAll(true);
			try {
				const result = await retryAllErroredContentItems(queue);
				if (!result.success) {
					throw new Error(result.error);
				}

				messageApi.success(getRetryAllSuccessMessage(result.retriedCount));
				await loadPage();
			} catch (error) {
				messageApi.error(`Failed to retry all: ${ formatErroredContentActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				setIsRetryingAll(false);
			}
		},
		[
			loadPage,
			messageApi,
			queue,
		],
	);

	return {
		isRetryingAll,
		retryAll,
	};
}
