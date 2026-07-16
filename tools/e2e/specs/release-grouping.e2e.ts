import {
	expect,
	type Page,
	test,
} from "@playwright/test";
import {
	callRendererApi,
	readRendererEvents,
	startRendererEventRecorder,
	stopRendererEventRecorder,
} from "../e2e-renderer-api";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import {
	evaluateRenderer,
	getMainSnapshot,
	runMainCommand,
	wait,
	waitForRendererCondition,
} from "../playwright-electron-helpers";

type ReleaseGroupingGroupRef = {
	groupId: number;
	source: "official" | "user";
};

export function registerReleaseGroupingTests(context: NimlatE2ETestContext): void {
	test(
		"release watch read models and renderer invalidation events",
		async () => {
			const basePage    = context.getBasePage();
			const electronApp = context.getElectronApp();
			const {
							ids,
							groupIds,
						}           = context.getSnapshot();
			await evaluateRenderer<void>(
				basePage,
				`(() => {
					window.__releaseWatchPastEvents = [];
					window.__releaseWatchUpcomingEvents = [];
					window.__unsubscribeReleaseWatchPast = window.electronAPI.releaseWatch.onPastListChanged((event) => window.__releaseWatchPastEvents.push(event));
					window.__unsubscribeReleaseWatchUpcoming = window.electronAPI.releaseWatch.onUpcomingListChanged((event) => window.__releaseWatchUpcomingEvents.push(event));
				})()`,
			);
			await runMainCommand(
				electronApp,
				"seedReleaseWatchRows",
			);

			const releaseWatchSnapshot = await evaluateRenderer<{
				pastTotal: number;
				pastItem?: { mediaId: number; state: string; payload?: { message?: string } };
				upcomingTotal: number;
				upcomingItem?: { mediaId: number; state: string; payload?: { message?: string } };
				timelineCount: number;
			}>(
				basePage,
				`(async () => {
					const past = await window.electronAPI.releaseWatch.listPast("tracked", 10, 0);
					const upcoming = await window.electronAPI.releaseWatch.listUpcoming("tracked", 10, 0);
					const timeline = await window.electronAPI.groupExplorer.getReleaseTimeline({
						source: "official",
						groupId: ${ groupIds.sourceGroupId },
					});
					return {
						pastTotal: past.total,
						pastItem: past.items.find((item) => item.mediaId === ${ ids.baseMedia }),
						upcomingTotal: upcoming.total,
						upcomingItem: upcoming.items.find((item) => item.mediaId === ${ ids.releaseWatchUpcomingMedia }),
						timelineCount: timeline.length,
					};
				})()`,
			);
			expect(releaseWatchSnapshot.pastTotal).toBeGreaterThanOrEqual(1);
			expect(releaseWatchSnapshot.pastItem?.state).toBe("released_needs_integration");
			expect(releaseWatchSnapshot.pastItem?.payload?.message).toBe("E2E past release");
			expect(releaseWatchSnapshot.upcomingTotal).toBeGreaterThanOrEqual(1);
			expect(releaseWatchSnapshot.upcomingItem?.state).toBe("upcoming_media_release");
			expect(releaseWatchSnapshot.upcomingItem?.payload?.message).toBe("E2E upcoming release");
			expect(releaseWatchSnapshot.timelineCount).toBeGreaterThanOrEqual(1);
			await waitForRendererCondition(
				basePage,
				`window.__releaseWatchPastEvents?.some((event) => event.affectedMediaIds?.includes(${ ids.baseMedia })) === true`,
			);
			await waitForRendererCondition(
				basePage,
				`window.__releaseWatchUpcomingEvents?.some((event) => event.affectedMediaIds?.includes(${ ids.releaseWatchUpcomingMedia })) === true`,
			);
			const pastEvents     = await evaluateRenderer<Array<{ affectedMediaIds?: number[] }>>(
				basePage,
				"window.__releaseWatchPastEvents",
			);
			const upcomingEvents = await evaluateRenderer<Array<{ affectedMediaIds?: number[] }>>(
				basePage,
				"window.__releaseWatchUpcomingEvents",
			);
			expect([
				...pastEvents,
				...upcomingEvents,
			].every((event) =>
				Array.isArray(event.affectedMediaIds)
				&& event.affectedMediaIds.length > 0
				&& event.affectedMediaIds.every((mediaId) => Number.isInteger(mediaId)),
			)).toBe(true);
			await evaluateRenderer<void>(
				basePage,
				`(() => {
					window.__unsubscribeReleaseWatchPast?.();
					window.__unsubscribeReleaseWatchUpcoming?.();
				})()`,
			);
		},
	);

	test(
		"group assignment and event bridge",
		async () => {
			const basePage    = context.getBasePage();
			const electronApp = context.getElectronApp();
			const {
							ids,
							groupIds,
						}           = context.getSnapshot();
			await runMainCommand(
				electronApp,
				"prepareSafeReconcile",
			);
			context.setSnapshot(await getMainSnapshot(electronApp));
			const currentGroupIds = context.getSnapshot().groupIds;
			await evaluateRenderer<void>(
				basePage,
				`(() => {
					window.__groupMediaEvents = [];
					window.__groupListEvents = [];
					window.__unsubscribeGroupMedia = window.electronAPI.groupExplorer.onGroupMediaListChanged((event) => window.__groupMediaEvents.push(event));
					window.__unsubscribeGroupList = window.electronAPI.groupExplorer.onGroupListChanged((event) => window.__groupListEvents.push(event));
					return true;
				})()`,
			);

			const safeApplyResult = await evaluateRenderer<{
				success: boolean;
				error?: string;
				report?: {
					applySummary: {
						newGroupsImported: number;
						existingLineagesUpdatedWithNewMedias: number;
						importedMediaCount: number;
					};
				};
			}>(
				basePage,
				"window.electronAPI.groupAssignments.runReconcileSafeApply()",
			);
			expect(
				safeApplyResult.success,
				safeApplyResult.error,
			).toBe(true);
			expect(safeApplyResult.report?.applySummary.newGroupsImported).toBe(1);
			expect(safeApplyResult.report?.applySummary.existingLineagesUpdatedWithNewMedias).toBe(1);
			expect(safeApplyResult.report?.applySummary.importedMediaCount).toBe(2);
			await wait(250);

			const sourceRangeAfterReconcile = await evaluateRenderer<{ items: Array<{ mediaId: number }> }>(
				basePage,
				`window.electronAPI.groupExplorer.listGroupMediaRange({ group: { source: "user", groupId: ${ groupIds.sourceGroupId } }, offset: 0, limit: 100, search: "" })`,
			);
			expect(sourceRangeAfterReconcile.items.some((media) => media.mediaId === ids.reconcileAddedMedia)).toBe(true);
			const importedReconcileCards = await evaluateRenderer<{ cards: Array<{ name: string }> }>(
				basePage,
				"window.electronAPI.groupExplorer.listCards(0, 20, 'Reconcile Imported')",
			);
			expect(importedReconcileCards.cards.some((card) => card.name === "E2E Reconcile Imported Group")).toBe(true);

			const assignmentResult = await evaluateRenderer<{ success: boolean }>(
				basePage,
				`window.electronAPI.groupAssignments.assignMediasManual({ groupId: ${ groupIds.targetGroupId }, mediaIds: [${ ids.baseMedia }] })`,
			);
			expect(assignmentResult.success).toBe(true);
			await wait(250);

			const targetRange = await evaluateRenderer<{ items: Array<{ mediaId: number }> }>(
				basePage,
				`window.electronAPI.groupExplorer.listGroupMediaRange({ group: { source: "user", groupId: ${ groupIds.targetGroupId } }, offset: 0, limit: 100, search: "" })`,
			);
			expect(targetRange.items.some((media) => media.mediaId === ids.baseMedia)).toBe(true);

			const deletedImportedLineageId = await runMainCommand(
				electronApp,
				"deleteImportedGroupLineage",
			);
			const restoreResult            = await evaluateRenderer<{
				success: boolean;
				error?: string;
				restoredGroupId?: number
			}>(
				basePage,
				`window.electronAPI.groupAssignments.restoreDeletedLineage({ groupLineageId: ${ deletedImportedLineageId } })`,
			);
			expect(
				restoreResult.success,
				restoreResult.error,
			).toBe(true);
			expect(restoreResult.restoredGroupId).toBe(currentGroupIds.reconcileImportedGroupId);
			await wait(250);

			const restoredImportedRange = await evaluateRenderer<{ items: Array<{ mediaId: number }> }>(
				basePage,
				`window.electronAPI.groupExplorer.listGroupMediaRange({ group: { source: "user", groupId: ${ currentGroupIds.reconcileImportedGroupId } }, offset: 0, limit: 100, search: "" })`,
			);
			expect(restoredImportedRange.items.some((media) => media.mediaId === ids.reconcileGroupMedia)).toBe(true);

			const groupMediaEvents = await evaluateRenderer<Array<{ affectedMediaIds: number[] }>>(
				basePage,
				"window.__groupMediaEvents",
			);
			expect(groupMediaEvents.some((event) => event.affectedMediaIds.includes(ids.baseMedia))).toBe(true);
			expect(groupMediaEvents.some((event) => event.affectedMediaIds.includes(ids.reconcileAddedMedia))).toBe(true);
			expect(groupMediaEvents.every((event) =>
				event.affectedMediaIds.length > 0
				&& event.affectedMediaIds.every((mediaId) => Number.isInteger(mediaId)),
			)).toBe(true);
			const groupListEventsBeforeReset = await evaluateRenderer<Array<{
				affectedGroups?: Array<{ source: "official" | "user"; groupId: number }>;
			}>>(
				basePage,
				"window.__groupListEvents",
			);
			expect(groupListEventsBeforeReset.length).toBeGreaterThan(0);
			expect(groupListEventsBeforeReset.every((event) =>
					event.affectedGroups === undefined
					|| event.affectedGroups.every((group) =>
						(group.source === "official" || group.source === "user")
						&& Number.isInteger(group.groupId),
					),
			)).toBe(true);
			await evaluateRenderer<void>(
				basePage,
				"window.electronAPI.userConfig.setAnimeDbVersion('e2e-v3')",
			);
			const rebuildResult = await evaluateRenderer<{ success: boolean; error?: string }>(
				basePage,
				"window.electronAPI.groupAssignments.rebuildFromCurrentAnimeDefaults()",
			);
			expect(
				rebuildResult.success,
				rebuildResult.error,
			).toBe(true);
			await wait(250);
			await expect(evaluateRenderer<string>(
				basePage,
				"window.electronAPI.groupExplorer.getGroupingMode()",
			)).resolves.toBe("user");

			const targetRangeAfterRebuild = await evaluateRenderer<{ items: Array<{ mediaId: number }> }>(
				basePage,
				`window.electronAPI.groupExplorer.listGroupMediaRange({ group: { source: "user", groupId: ${ groupIds.targetGroupId } }, offset: 0, limit: 100, search: "" })`,
			);
			expect(targetRangeAfterRebuild.items.every((media) => media.mediaId !== ids.baseMedia)).toBe(true);
			const importedCardsAfterRebuild = await evaluateRenderer<{ cards: Array<{ name: string }> }>(
				basePage,
				"window.electronAPI.groupExplorer.listCards(0, 20, 'Reconcile Imported')",
			);
			expect(importedCardsAfterRebuild.cards.some((card) => card.name === "E2E Reconcile Imported Group")).toBe(true);

			const resetResult = await evaluateRenderer<{ success: boolean; error?: string }>(
				basePage,
				"window.electronAPI.groupAssignments.resetToAnimeGrouping()",
			);
			expect(
				resetResult.success,
				resetResult.error,
			).toBe(true);
			await wait(250);
			await expect(evaluateRenderer<string>(
				basePage,
				"window.electronAPI.groupExplorer.getGroupingMode()",
			)).resolves.toBe("anime");

			const targetRangeAfterReset = await evaluateRenderer<{ items: Array<{ mediaId: number }> }>(
				basePage,
				`window.electronAPI.groupExplorer.listGroupMediaRange({ group: { source: "official", groupId: ${ groupIds.targetGroupId } }, offset: 0, limit: 100, search: "" })`,
			);
			expect(targetRangeAfterReset.items.every((media) => media.mediaId !== ids.baseMedia)).toBe(true);
			const groupListEventsAfterReset = await evaluateRenderer<Array<{
				affectedGroups?: Array<{ source: "official" | "user"; groupId: number }>;
			}>>(
				basePage,
				"window.__groupListEvents",
			);
			expect(groupListEventsAfterReset.length).toBeGreaterThan(groupListEventsBeforeReset.length);
			expect(groupListEventsAfterReset.every((event) =>
					event.affectedGroups === undefined
					|| event.affectedGroups.every((group) =>
						(group.source === "official" || group.source === "user")
						&& Number.isInteger(group.groupId),
					),
			)).toBe(true);
			const animeGroupExists = await runMainCommand(
				electronApp,
				"getAnimeGroupExists",
				[ currentGroupIds.reconcileImportedGroupId ],
			);
			expect(animeGroupExists).toBe(true);
		},
	);

	test(
		"manual library grouping mutations fork, merge, delete, and reset through IPC",
		async () => {
			const basePage = context.getBasePage();
			const {
							ids,
							groupIds,
						}        = context.getSnapshot();

			const resetBeforeResult = await callRendererApi(
				basePage,
				"groupAssignments",
				"resetToAnimeGrouping",
			);
			expectSuccessfulAction(resetBeforeResult);
			await expect(callRendererApi(
				basePage,
				"groupExplorer",
				"getGroupingMode",
			)).resolves.toBe("anime");

			let recordersStarted = false;
			try {
				await startRendererEventRecorder(
					basePage,
					"groupMediaListChanged",
				);
				await startRendererEventRecorder(
					basePage,
					"groupListChanged",
				);
				recordersStarted = true;

				const createdResult = await callRendererApi(
					basePage,
					"groupAssignments",
					"createMergedGroupFromLibrarySelection",
					{
						name:  "E2E Manual Replacement Group",
						items: [
							{
								kind:  "group",
								group: {
									source:  "official",
									groupId: groupIds.sourceGroupId,
								},
							},
							{
								kind:  "group",
								group: {
									source:  "official",
									groupId: groupIds.targetGroupId,
								},
							},
							{
								kind:    "media",
								mediaId: ids.filmMedia,
							},
						],
					},
				);
				expectSuccessfulAction(createdResult);
				const createdGroupId = createdResult.createdGroupId;

				await expect(callRendererApi(
					basePage,
					"groupExplorer",
					"getGroupingMode",
				)).resolves.toBe("user");
				const createdGroup   = {
					source:  "user",
					groupId: createdGroupId,
				} as const;
				const createdSummary = await readGroupSummary(
					basePage,
					createdGroup,
				);
				expect(createdSummary?.name).toBe("E2E Manual Replacement Group");
				expectMediaIdsToContain(
					await readGroupMediaIds(
						basePage,
						createdGroup,
					),
					[
						ids.baseMedia,
						ids.relatedMedia,
						ids.filmMedia,
					],
				);
				await expect(readGroupSummary(
					basePage,
					{
						source:  "user",
						groupId: groupIds.sourceGroupId,
					},
				)).resolves.toBeNull();
				await expect(readGroupSummary(
					basePage,
					{
						source:  "user",
						groupId: groupIds.targetGroupId,
					},
				)).resolves.toBeNull();

				const mergeResult = await callRendererApi(
					basePage,
					"groupAssignments",
					"mergeLibrarySelectionIntoGroup",
					{
						targetGroupId: createdGroupId,
						items:         [
							{
								kind:  "group",
								group: {
									source:  "user",
									groupId: createdGroupId,
								},
							},
							{
								kind:  "group",
								group: {
									source:  "user",
									groupId: groupIds.libraryHideGroupId,
								},
							},
							{
								kind:    "media",
								mediaId: ids.missingMalMedia,
							},
						],
					},
				);
				expectSuccessfulAction(mergeResult);
				expectMediaIdsToContain(
					await readGroupMediaIds(
						basePage,
						createdGroup,
					),
					[
						ids.libraryHideMedia,
						ids.missingMalMedia,
					],
				);
				await expect(readGroupSummary(
					basePage,
					{
						source:  "user",
						groupId: groupIds.libraryHideGroupId,
					},
				)).resolves.toBeNull();

				const removeResult = await callRendererApi(
					basePage,
					"groupAssignments",
					"removeMediaManual",
					{
						groupId: createdGroupId,
						mediaId: ids.filmMedia,
					},
				);
				expectSuccessfulAction(removeResult);
				await expect(readGroupMediaIds(
					basePage,
					createdGroup,
				)).resolves.not.toContain(ids.filmMedia);

				const deleteResult = await callRendererApi(
					basePage,
					"groupAssignments",
					"deleteGroupManual",
					{
						group: {
							source:  "user",
							groupId: createdGroupId,
						},
					},
				);
				expectSuccessfulAction(deleteResult);
				await expect(readGroupSummary(
					basePage,
					createdGroup,
				)).resolves.toBeNull();

				const userLibraryAfterDelete = await callRendererApi(
					basePage,
					"groupExplorer",
					"listLibraryItemsRange",
					{
						offset: 0,
						limit:  160,
						search: "",
						scope:  "library",
					},
				);
				const userLibraryKeys        = userLibraryAfterDelete.items.map((item) => item.key);
				expect(userLibraryKeys).toEqual(expect.arrayContaining([
					`media:${ ids.baseMedia }`,
					`media:${ ids.relatedMedia }`,
					`media:${ ids.libraryHideMedia }`,
				]));

				const expectedGroupMediaEventIds = [
					ids.baseMedia,
					ids.relatedMedia,
					ids.filmMedia,
					ids.libraryHideMedia,
					ids.missingMalMedia,
				];
				await waitForRendererCondition(
					basePage,
					`(() => {
						const expectedMediaIds = ${ JSON.stringify(expectedGroupMediaEventIds) };
						const events = window.__nimlatE2EEventBuffers?.groupMediaListChanged ?? [];
						const affectedMediaIds = new Set(events.flatMap((event) => Array.isArray(event?.affectedMediaIds) ? event.affectedMediaIds : []));
						return expectedMediaIds.every((mediaId) => affectedMediaIds.has(mediaId));
					})()`,
				);
				await waitForRendererCondition(
					basePage,
					`window.__nimlatE2EEventBuffers?.groupListChanged?.some((event) =>
						event.affectedGroups?.some((group) => group.source === "user" && group.groupId === ${ createdGroupId }) === true
					) === true`,
				);
				const groupMediaEvents = await readRendererEvents(
					basePage,
					"groupMediaListChanged",
				);
				expect(groupMediaEvents.every((event) =>
					event.affectedMediaIds.length > 0
					&& event.affectedMediaIds.every((mediaId) => Number.isInteger(mediaId)),
				)).toBe(true);
				expectMediaIdsToContain(
					groupMediaEvents.flatMap((event) => event.affectedMediaIds),
					expectedGroupMediaEventIds,
				);
				const groupListEvents = await readRendererEvents(
					basePage,
					"groupListChanged",
				);
				expect(groupListEvents.some((event) =>
					event.affectedGroups?.some((group) => group.source === "user" && group.groupId === createdGroupId) === true,
				)).toBe(true);
				expect(groupListEvents.every((event) =>
						event.affectedGroups === undefined
						|| event.affectedGroups.every((group) =>
							(group.source === "official" || group.source === "user")
							&& Number.isInteger(group.groupId),
						),
				)).toBe(true);
			} finally {
				if (recordersStarted) {
					await stopRendererEventRecorder(
						basePage,
						"groupMediaListChanged",
					).catch(() => undefined);
					await stopRendererEventRecorder(
						basePage,
						"groupListChanged",
					).catch(() => undefined);
				}
				await callRendererApi(
					basePage,
					"groupAssignments",
					"resetToAnimeGrouping",
				).catch(() => undefined);
			}

			await expect(callRendererApi(
				basePage,
				"groupExplorer",
				"getGroupingMode",
			)).resolves.toBe("anime");
			const officialSourceMediaIds = await readGroupMediaIds(
				basePage,
				{
					source:  "official",
					groupId: groupIds.sourceGroupId,
				},
			);
			expect(officialSourceMediaIds).toContain(ids.baseMedia);
		},
	);
}

function expectSuccessfulAction<T extends { success: boolean }>(
	result: T,
): asserts result is Extract<T, { success: true }> {
	const errorMessage = "error" in result && typeof result.error === "string"
		? result.error
		: undefined;
	expect(
		result.success,
		errorMessage,
	).toBe(true);
}

async function readGroupSummary(page: Page, group: ReleaseGroupingGroupRef) {
	return callRendererApi(
		page,
		"groupExplorer",
		"getInspectionSummary",
		group,
	);
}

async function readGroupMediaIds(page: Page, group: ReleaseGroupingGroupRef): Promise<number[]> {
	const range = await callRendererApi(
		page,
		"groupExplorer",
		"listGroupMediaRange",
		{
			group,
			offset: 0,
			limit:  100,
			search: "",
		},
	);
	return range.items.map((media) => media.mediaId);
}

function expectMediaIdsToContain(actualMediaIds: number[], expectedMediaIds: number[]): void {
	expect(actualMediaIds).toEqual(expect.arrayContaining(expectedMediaIds));
}
