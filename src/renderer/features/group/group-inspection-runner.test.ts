import type {
	GroupInspectionSummary,
	GroupListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../facades";
import {
	groupInspectionListChanges,
	loadGroupInspectionSummary,
	loadGroupReleaseTimeline,
	persistGroupIntegrationStatus,
	persistGroupWatchState,
} from "./group-inspection-runner";

describe(
	"group-inspection-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads group summary and release timeline through the group explorer facade",
			async () => {
				const group                                   = {
					source:  "user" as const,
					groupId: 3,
				};
				const summary: GroupInspectionSummary         = {
					groupId:            3,
					name:               "Group",
					mediasCount:        2,
					watchedMediasCount: 1,
				};
				const timelineRows: GroupReleaseTimelineRow[] = [
					{
						mediaId:              9,
						name:                 "Media",
						resolvedReleaseAt:    null,
						releaseDatePrecision: "unknown",
						releaseDateSource:    "none",
					},
				];
				vi.spyOn(
					GroupExplorerFacade,
					"getInspectionSummary",
				).mockResolvedValue(summary);
				vi.spyOn(
					GroupExplorerFacade,
					"getReleaseTimeline",
				).mockResolvedValue(timelineRows);

				await expect(loadGroupInspectionSummary(group)).resolves.toBe(summary);
				await expect(loadGroupReleaseTimeline(group)).resolves.toBe(timelineRows);

				expect(GroupExplorerFacade.getInspectionSummary).toHaveBeenCalledWith(group);
				expect(GroupExplorerFacade.getReleaseTimeline).toHaveBeenCalledWith(group);
			},
		);

		it(
			"exposes group list change events from the group explorer facade",
			() => {
				const changes$ = new Subject<GroupListChangedEvent>();
				const listener = vi.fn();
				vi.spyOn(
					GroupExplorerFacade,
					"groupListChanges",
				).mockReturnValue(changes$);

				const subscription                 = groupInspectionListChanges().subscribe(listener);
				const event: GroupListChangedEvent = {
					affectedGroups: [
						{
							source:  "official",
							groupId: 7,
						},
					],
				};

				changes$.next(event);

				expect(listener).toHaveBeenCalledWith(event);
				expect(GroupExplorerFacade.groupListChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"persists group-level watch and integration mutations through the group explorer facade",
			async () => {
				const group = {
					source:  "user" as const,
					groupId: 3,
				};
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [
						1,
						2,
					],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistGroupWatchState(
					group,
					true,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [
						1,
						2,
					],
				});
				await expect(persistGroupIntegrationStatus(
					group,
					"tracked",
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setGroupWatchState).toHaveBeenCalledWith({
					group,
					isWatched: true,
				});
				expect(GroupExplorerFacade.setGroupIntegrationStatus).toHaveBeenCalledWith({
					group,
					integrationStatus: "tracked",
				});
			},
		);
	},
);
