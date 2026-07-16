import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";

const BATCH_FAILURE_PREVIEW_LIMIT = 3;

type LibraryItemActionTarget =
	| {
	kind: "group";
	group: NonNullable<LibraryDisplayItem["group"]>;
}
	| {
	kind: "media";
	mediaId: number;
};

type ExistingGroupAddToCommand = "assignToGroup" | "mergeIntoTarget";
type NewGroupAddToCommand = "createGroup" | "createMergedGroup";

function normalizeActionErrorMessage(errorMessage: string): string {
	return errorMessage.trim().length > 0 ? errorMessage : "unknown error";
}

export function formatLibraryActionError(error: unknown, fallbackMessage: string): string {
	return error instanceof Error && error.message.trim().length > 0 ? error.message : fallbackMessage;
}

export function getLibraryItemKeySet(items: LibraryDisplayItem[]): Set<string> {
	return new Set(items.map(item => item.key));
}

export function getSingleLibraryItemKeySet(item: LibraryDisplayItem): Set<string> {
	return new Set([ item.key ]);
}

export function appendUniqueKeys(currentKeys: string[], keysToAdd: Iterable<string>): string[] {
	return Array.from(new Set([
		...currentKeys,
		...keysToAdd,
	]));
}

export function removeKeys(currentKeys: string[], keysToRemove: ReadonlySet<string>): string[] {
	return currentKeys.filter(key => !keysToRemove.has(key));
}

function isIgnoredStatus(status: IntegrationStatus | null): boolean {
	return status === "ignored";
}

export function leavesCurrentLibraryScope(isIgnoredScope: boolean, nextStatus: IntegrationStatus | null): boolean {
	return (isIgnoredScope && !isIgnoredStatus(nextStatus))
		|| (!isIgnoredScope && isIgnoredStatus(nextStatus));
}

export function isLibraryItemIntegrationActionable(item: LibraryDisplayItem): boolean {
	return (item.kind === "group" && item.group !== undefined)
		|| typeof item.mediaId === "number";
}

export function isLibraryItemRefreshable(item: LibraryDisplayItem): boolean {
	return (item.kind === "group" && item.group !== undefined)
		|| typeof item.mediaId === "number";
}

export function getLibraryItemActionTarget(item: LibraryDisplayItem): LibraryItemActionTarget | null {
	if (item.kind === "group" && item.group !== undefined) {
		return {
			kind:  "group",
			group: item.group,
		};
	}

	if (typeof item.mediaId === "number") {
		return {
			kind:    "media",
			mediaId: item.mediaId,
		};
	}

	return null;
}

export function selectExistingGroupAddToCommand({
																									hasMergeableSelectedGroups,
																									isPreferredTarget,
																								}: {
	hasMergeableSelectedGroups: boolean;
	isPreferredTarget: boolean;
}): ExistingGroupAddToCommand {
	return isPreferredTarget && hasMergeableSelectedGroups
		? "mergeIntoTarget"
		: "assignToGroup";
}

export function selectNewGroupAddToCommand(hasSelectedGroup: boolean): NewGroupAddToCommand {
	return hasSelectedGroup ? "createMergedGroup" : "createGroup";
}

export function isLibraryItemDeletableGroup(
	item: LibraryDisplayItem,
): item is LibraryDisplayItem & { kind: "group"; group: NonNullable<LibraryDisplayItem["group"]> } {
	return item.kind === "group" && item.group !== undefined;
}

export function setLibraryItemIntegrationStatus(
	item: LibraryDisplayItem,
	integrationStatus: IntegrationStatus | null,
): LibraryDisplayItem {
	return {
		...item,
		integrationStatus,
	};
}

export function createLibraryItemActionSuccess(item: LibraryDisplayItem) {
	return {
		item,
		success: true as const,
	};
}

export function createLibraryItemActionFailure(
	item: LibraryDisplayItem,
	error: string,
) {
	return {
		item,
		success: false as const,
		error:   normalizeActionErrorMessage(error),
	};
}

type LibraryItemActionOutcome =
	| ReturnType<typeof createLibraryItemActionSuccess>
	| ReturnType<typeof createLibraryItemActionFailure>;

function formatLibraryItemActionFailure(item: LibraryDisplayItem, error: string): string {
	return `${ item.name }: ${ normalizeActionErrorMessage(error) }`;
}

export function summarizeLibraryItemActionOutcomes(outcomes: ReadonlyArray<LibraryItemActionOutcome>) {
	const succeededItems  = outcomes.flatMap(outcome => outcome.success ? [ outcome.item ] : []);
	const succeededKeySet = getLibraryItemKeySet(succeededItems);
	const failedMessages  = outcomes.flatMap(outcome => outcome.success
		? []
		: [
			formatLibraryItemActionFailure(
				outcome.item,
				outcome.error,
			),
		]);

	return {
		succeededKeySet,
		succeededCount: succeededKeySet.size,
		failedMessages,
		failedCount:    failedMessages.length,
	};
}

export function formatLibraryBatchFailureMessage(
	actionLabel: string,
	failedMessages: readonly string[],
): string | null {
	if (failedMessages.length === 0) {
		return null;
	}

	const visibleFailures      = failedMessages.slice(
		0,
		BATCH_FAILURE_PREVIEW_LIMIT,
	);
	const hiddenFailureCount   = failedMessages.length - visibleFailures.length;
	const itemLabel            = failedMessages.length === 1 ? "item" : "items";
	const hiddenFailureMessage = hiddenFailureCount > 0 ? `; ${ hiddenFailureCount } more failed` : "";

	return `Failed to ${ actionLabel } ${ failedMessages.length } ${ itemLabel }: ${ visibleFailures.join("; ") }${ hiddenFailureMessage }.`;
}

export function getEffectiveLibraryWatchedState(
	item: LibraryDisplayItem,
	watchStateOverrides: ReadonlyMap<string, boolean>,
): boolean {
	return watchStateOverrides.get(item.key) ?? item.isWatched === true;
}

export function setLibraryWatchStateOverride(
	currentOverrides: ReadonlyMap<string, boolean>,
	itemKey: string,
	nextWatched: boolean,
): Map<string, boolean> {
	return new Map(currentOverrides).set(
		itemKey,
		nextWatched,
	);
}

export function rollbackLibraryWatchStateOverride(
	currentOverrides: Map<string, boolean>,
	itemKey: string,
	failedWatched: boolean,
	previousWatched: boolean,
): Map<string, boolean> {
	return currentOverrides.get(itemKey) === failedWatched
		? new Map(currentOverrides).set(
			itemKey,
			previousWatched,
		)
		: currentOverrides;
}

export function shouldRollbackLibraryWatchState(
	currentOverrides: ReadonlyMap<string, boolean>,
	itemKey: string,
	failedWatched: boolean,
): boolean {
	return currentOverrides.get(itemKey) === failedWatched;
}

export function setLibraryItemWatchedState(
	item: LibraryDisplayItem,
	isWatched: boolean,
): LibraryDisplayItem {
	return {
		...item,
		isWatched,
	};
}
