import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	appendUniqueKeys,
	createLibraryItemActionFailure,
	createLibraryItemActionSuccess,
	formatLibraryActionError,
	formatLibraryBatchFailureMessage,
	getEffectiveLibraryWatchedState,
	getLibraryItemActionTarget,
	getLibraryItemKeySet,
	getSingleLibraryItemKeySet,
	isLibraryItemDeletableGroup,
	isLibraryItemIntegrationActionable,
	isLibraryItemRefreshable,
	leavesCurrentLibraryScope,
	removeKeys,
	rollbackLibraryWatchStateOverride,
	selectExistingGroupAddToCommand,
	selectNewGroupAddToCommand,
	setLibraryItemIntegrationStatus,
	setLibraryItemWatchedState,
	setLibraryWatchStateOverride,
	shouldRollbackLibraryWatchState,
	summarizeLibraryItemActionOutcomes,
} from "./library-item-actions-model";

function createItem(key: string): LibraryDisplayItem {
	return {
		key,
		kind:        "media",
		name:        key,
		lastRefresh: "",
	};
}

describe(
	"library item actions model",
	() => {
		it(
			"formats unknown errors without leaking non-error values",
			() => {
				expect(formatLibraryActionError(
					new Error("boom"),
					"fallback",
				)).toBe("boom");
				expect(formatLibraryActionError(
					{ message: "not trusted" },
					"fallback",
				)).toBe("fallback");
				expect(formatLibraryActionError(
					new Error("   "),
					"fallback",
				)).toBe("fallback");
			},
		);

		it(
			"creates stable key sets from selected items",
			() => {
				const firstItem = createItem("media:1");
				expect(getSingleLibraryItemKeySet(firstItem)).toEqual(new Set([ "media:1" ]));
				expect(getLibraryItemKeySet([
					firstItem,
					createItem("media:2"),
					createItem("media:1"),
				])).toEqual(new Set([
					"media:1",
					"media:2",
				]));
			},
		);

		it(
			"adds and removes busy keys without duplicates",
			() => {
				expect(appendUniqueKeys(
					[
						"media:1",
						"media:2",
					],
					[
						"media:2",
						"media:3",
					],
				)).toEqual([
					"media:1",
					"media:2",
					"media:3",
				]);
				expect(removeKeys(
					[
						"media:1",
						"media:2",
						"media:3",
					],
					new Set([
						"media:1",
						"media:3",
					]),
				)).toEqual([ "media:2" ]);
			},
		);

		it(
			"detects when an integration status change leaves the visible scope",
			() => {
				expect(leavesCurrentLibraryScope(
					false,
					"ignored",
				)).toBe(true);
				expect(leavesCurrentLibraryScope(
					false,
					null,
				)).toBe(false);
				expect(leavesCurrentLibraryScope(
					true,
					"ignored",
				)).toBe(false);
				expect(leavesCurrentLibraryScope(
					true,
					null,
				)).toBe(true);
			},
		);

		it(
			"summarizes integration action batches without losing partial successes",
			() => {
				const firstItem    = createItem("media:1");
				const batchOutcome = summarizeLibraryItemActionOutcomes([
					createLibraryItemActionSuccess(firstItem),
					createLibraryItemActionFailure(
						createItem("media:2"),
						"write failed",
					),
					createLibraryItemActionFailure(
						createItem("media:3"),
						"network failed",
					),
					createLibraryItemActionFailure(
						createItem("media:4"),
						"   ",
					),
					createLibraryItemActionFailure(
						createItem("media:5"),
						"permission failed",
					),
				]);

				expect(batchOutcome.succeededKeySet).toEqual(new Set([ "media:1" ]));
				expect(batchOutcome.succeededCount).toBe(1);
				expect(batchOutcome.failedCount).toBe(4);
				expect(batchOutcome.failedMessages).toEqual([
					"media:2: write failed",
					"media:3: network failed",
					"media:4: unknown error",
					"media:5: permission failed",
				]);
				expect(formatLibraryBatchFailureMessage(
					"ignore",
					batchOutcome.failedMessages,
				)).toBe("Failed to ignore 4 items: media:2: write failed; media:3: network failed; media:4: unknown error; 1 more failed.");
				expect(formatLibraryBatchFailureMessage(
					"ignore",
					[],
				)).toBeNull();
			},
		);

		it(
			"keeps item state and actionability decisions pure",
			() => {
				const mediaItem = {
					...createItem("media:1"),
					mediaId: 1,
				};
				const groupItem = {
					...createItem("group:official:1"),
					kind:  "group" as const,
					group: {
						source:  "official" as const,
						groupId: 1,
					},
				};

				expect(isLibraryItemIntegrationActionable(mediaItem)).toBe(true);
				expect(isLibraryItemIntegrationActionable(groupItem)).toBe(true);
				expect(isLibraryItemIntegrationActionable(createItem("media:missing"))).toBe(false);
				expect(isLibraryItemRefreshable(mediaItem)).toBe(true);
				expect(isLibraryItemRefreshable(groupItem)).toBe(true);
				expect(isLibraryItemRefreshable(createItem("media:missing"))).toBe(false);
				expect(getLibraryItemActionTarget(mediaItem)).toEqual({
					kind:    "media",
					mediaId: 1,
				});
				expect(getLibraryItemActionTarget(groupItem)).toEqual({
					kind:  "group",
					group: {
						source:  "official",
						groupId: 1,
					},
				});
				expect(getLibraryItemActionTarget(createItem("media:missing"))).toBeNull();
				expect(isLibraryItemDeletableGroup(mediaItem)).toBe(false);
				expect(isLibraryItemDeletableGroup(groupItem)).toBe(true);
				expect(setLibraryItemIntegrationStatus(
					mediaItem,
					"tracked",
				)).toEqual({
					...mediaItem,
					integrationStatus: "tracked",
				});
			},
		);

		it(
			"selects Add To commands from pure selection state",
			() => {
				expect(selectExistingGroupAddToCommand({
					hasMergeableSelectedGroups: true,
					isPreferredTarget:          true,
				})).toBe("mergeIntoTarget");
				expect(selectExistingGroupAddToCommand({
					hasMergeableSelectedGroups: true,
					isPreferredTarget:          false,
				})).toBe("assignToGroup");
				expect(selectExistingGroupAddToCommand({
					hasMergeableSelectedGroups: false,
					isPreferredTarget:          true,
				})).toBe("assignToGroup");
				expect(selectNewGroupAddToCommand(false)).toBe("createGroup");
				expect(selectNewGroupAddToCommand(true)).toBe("createMergedGroup");
			},
		);

		it(
			"keeps watched-state optimistic updates and guarded rollbacks pure",
			() => {
				const item                = {
					...createItem("media:1"),
					isWatched: false,
				};
				const optimisticOverrides = setLibraryWatchStateOverride(
					new Map(),
					item.key,
					true,
				);

				expect(getEffectiveLibraryWatchedState(
					item,
					optimisticOverrides,
				)).toBe(true);
				expect(setLibraryItemWatchedState(
					item,
					true,
				)).toEqual({
					...item,
					isWatched: true,
				});
				expect(shouldRollbackLibraryWatchState(
					optimisticOverrides,
					item.key,
					true,
				)).toBe(true);
				expect(rollbackLibraryWatchStateOverride(
					optimisticOverrides,
					item.key,
					true,
					false,
				).get(item.key)).toBe(false);
				expect(rollbackLibraryWatchStateOverride(
					optimisticOverrides,
					item.key,
					false,
					false,
				)).toBe(optimisticOverrides);
			},
		);
	},
);
