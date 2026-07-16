import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { useAppMessage } from "../../../hooks";
import {
	hideErroredContentItem,
	reportErroredContentItem,
	retryErroredContentItem,
} from "../errored-content-runner";
import { formatErroredContentActionError } from "../errored-content-state-model";
import type { SetErroredContentActionBusy } from "./use-errored-content-pending-actions";

interface UseErroredContentItemActionsInput {
	loadPage: (offset?: number) => Promise<void>;
	setActionBusy: SetErroredContentActionBusy;
}

interface UseErroredContentItemActionsResult {
	retryItem: (item: ErroredContentItem) => Promise<void>;
	hideItem: (item: ErroredContentItem) => Promise<void>;
	reportItem: (item: ErroredContentItem) => Promise<void>;
}

// Owns row command side effects. The hook deliberately refreshes by asking the
// page feed to reload instead of mutating list state locally.
export function useErroredContentItemActions({
																							 loadPage,
																							 setActionBusy,
																						 }: UseErroredContentItemActionsInput): UseErroredContentItemActionsResult {
	const messageApi = useAppMessage();

	const retryItem = useCallback(
		async (item: ErroredContentItem): Promise<void> => {
			if (!item.canRetry) {
				messageApi.warning("This failure is not retryable. Report it or hide it from this list.");
				return;
			}

			setActionBusy(
				item,
				"retry",
				true,
			);
			try {
				const result = await retryErroredContentItem(item);
				if (!result.success) {
					throw new Error(result.error);
				}
				messageApi.success("Retry queued.");
				await loadPage();
			} catch (error) {
				messageApi.error(`Failed to retry item: ${ formatErroredContentActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				setActionBusy(
					item,
					"retry",
					false,
				);
			}
		},
		[
			loadPage,
			messageApi,
			setActionBusy,
		],
	);

	const hideItem = useCallback(
		async (item: ErroredContentItem): Promise<void> => {
			setActionBusy(
				item,
				"hide",
				true,
			);
			try {
				const result = await hideErroredContentItem(item);
				if (!result.success) {
					throw new Error(result.error);
				}
				messageApi.success("Failed item hidden.");
				await loadPage();
			} catch (error) {
				messageApi.error(`Failed to hide item: ${ formatErroredContentActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				setActionBusy(
					item,
					"hide",
					false,
				);
			}
		},
		[
			loadPage,
			messageApi,
			setActionBusy,
		],
	);

	const reportItem = useCallback(
		async (item: ErroredContentItem): Promise<void> => {
			setActionBusy(
				item,
				"report",
				true,
			);
			try {
				const result = await reportErroredContentItem(item);
				if (!result.success) {
					throw new Error(result.error);
				}
				messageApi.success(`GitHub report opened for ${ result.fingerprint }.`);
			} catch (error) {
				messageApi.error(`Failed to report item: ${ formatErroredContentActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				setActionBusy(
					item,
					"report",
					false,
				);
			}
		},
		[
			messageApi,
			setActionBusy,
		],
	);

	return {
		retryItem,
		hideItem,
		reportItem,
	};
}
