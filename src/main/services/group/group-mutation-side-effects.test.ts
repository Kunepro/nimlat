// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const groupListChangedNext      = vi.fn();
const groupMediaListChangedNext = vi.fn();
const handleGroupingMutation    = vi.fn();
const recomputeSnapshots        = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_GroupListChanged:      {
			next: groupListChangedNext,
		},
		BUS_GroupMediaListChanged: {
			next: groupMediaListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			integration: {
				group: {
					recomputeSnapshotsForGroupRefs: recomputeSnapshots,
				},
			},
		},
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: {
			handleGroupingMutation,
		},
	}),
);

describe(
	"group-mutation-side-effects",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"recomputes official group snapshots before publishing create invalidations",
			async () => {
				const {
								createOfficialGroupRef,
								publishOfficialGroupCreated,
							} = await import("./group-mutation-side-effects");

				publishOfficialGroupCreated(
					createOfficialGroupRef(7),
					[
						21,
						22,
					],
				);

				expect(recomputeSnapshots).toHaveBeenCalledWith([
					{
						source:  "official",
						groupId: 7,
					},
				]);
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups:           [
						{
							source:  "official",
							groupId: 7,
						},
					],
					affectedMediaIds: [
						21,
						22,
					],
				});
				expect(recomputeSnapshots.mock.invocationCallOrder[ 0 ]).toBeLessThan(groupListChangedNext.mock.invocationCallOrder[ 0 ]);
				expect(groupListChangedNext.mock.invocationCallOrder[ 0 ]).toBeLessThan(groupMediaListChangedNext.mock.invocationCallOrder[ 0 ]);
			},
		);

		it(
			"does not recompute snapshots for already removed official groups",
			async () => {
				const {
								createOfficialGroupRef,
								publishOfficialGroupRemoved,
							} = await import("./group-mutation-side-effects");

				publishOfficialGroupRemoved(
					createOfficialGroupRef(8),
					[ 31 ],
				);

				expect(recomputeSnapshots).not.toHaveBeenCalled();
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups:           [
						{
							source:  "official",
							groupId: 8,
						},
					],
					affectedMediaIds: [ 31 ],
				});
			},
		);

		it(
			"maps user mutation impacts to user group refs before delegating to the library coordinator",
			async () => {
				const { publishUserGroupingMutation } = await import("./group-mutation-side-effects");

				publishUserGroupingMutation(
					{
						affectedMediaIds: [
							41,
							42,
						],
						affectedGroupIds: [
							4,
							5,
						],
					},
					"manual-group-test",
				);

				const expectedGroups = [
					{
						source:  "user",
						groupId: 4,
					},
					{
						source:  "user",
						groupId: 5,
					},
				];
				expect(recomputeSnapshots).toHaveBeenCalledWith(expectedGroups);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						41,
						42,
					],
					affectedGroups:   expectedGroups,
					context:          "manual-group-test",
				});
				expect(recomputeSnapshots.mock.invocationCallOrder[ 0 ]).toBeLessThan(handleGroupingMutation.mock.invocationCallOrder[ 0 ]);
			},
		);
	},
);
