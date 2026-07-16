import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	IntegrationStatusActionResult,
	LibraryDisplayItem,
} from "@nimlat/types/ipc-payloads";
import { GroupExplorerFacade } from "../../../facades";
import {
	createLibraryItemActionFailure,
	createLibraryItemActionSuccess,
	formatLibraryActionError,
	isLibraryItemIntegrationActionable,
} from "./library-item-actions-model";

export async function persistLibraryItemIntegrationStatus(
	item: LibraryDisplayItem,
	integrationStatus: IntegrationStatus | null,
): Promise<IntegrationStatusActionResult | null> {
	if (item.kind === "group" && item.group) {
		return GroupExplorerFacade.setGroupIntegrationStatus({
			group: item.group,
			integrationStatus,
		});
	}

	if (typeof item.mediaId === "number") {
		return GroupExplorerFacade.setMediaIntegrationStatus({
			mediaId: item.mediaId,
			integrationStatus,
		});
	}

	return null;
}

async function persistLibraryItemIntegrationActionOutcome(
	item: LibraryDisplayItem,
	integrationStatus: IntegrationStatus,
) {
	if (!isLibraryItemIntegrationActionable(item)) {
		return createLibraryItemActionFailure(
			item,
			"item has no integration target",
		);
	}

	try {
		const result = await persistLibraryItemIntegrationStatus(
			item,
			integrationStatus,
		);

		return result?.success
			? createLibraryItemActionSuccess(item)
			: createLibraryItemActionFailure(
				item,
				result?.error ?? "unknown error",
			);
	} catch (error) {
		return createLibraryItemActionFailure(
			item,
			formatLibraryActionError(
				error,
				"unknown error",
			),
		);
	}
}

export async function collectLibraryItemIntegrationActionOutcomes(
	items: readonly LibraryDisplayItem[],
	integrationStatus: IntegrationStatus,
) {
	const outcomes: Array<Awaited<ReturnType<typeof persistLibraryItemIntegrationActionOutcome>>> = [];
	for (const item of items) {
		// Keep writes sequential: the action is user-initiated, DB-backed, and selected
		// item counts can grow. We still reconcile partial success without flooding IPC.
		outcomes.push(await persistLibraryItemIntegrationActionOutcome(
			item,
			integrationStatus,
		));
	}

	return outcomes;
}
