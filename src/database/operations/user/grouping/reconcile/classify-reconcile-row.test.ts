// @vitest-environment node
import type { Database } from "better-sqlite3";
import {
	describe,
	expect,
	it,
} from "vitest";
import type { LineageMetaRow } from "./classify-reconcile-lineage-types";
import {
	classifyMissingUpstreamGroupRow,
	classifyMissingUpstreamLineageRow,
	classifyReconcileLineageMetaRow,
} from "./classify-reconcile-row";

const noopDb = {} as Database;

function createMembershipDb(params: {
	animeOnlyMediaIds?: number[];
	missingAnimeMediaIds?: number[];
	userOnlyMediaIds?: number[];
}): Database {
	const missingAnimeMediaIds = new Set(params.missingAnimeMediaIds ?? []);

	return {
		prepare: (sql: string) => {
			if (sql.includes("SELECT ugm.mediaId")) {
				return {
					all: () => (params.userOnlyMediaIds ?? []).map(mediaId => ({ mediaId })),
				};
			}
			if (sql.includes("SELECT agm.mediaId")) {
				return {
					all: () => (params.animeOnlyMediaIds ?? []).map(mediaId => ({ mediaId })),
				};
			}
			if (sql.includes("FROM anime_data.media")) {
				return {
					get: (mediaId: number) => missingAnimeMediaIds.has(mediaId) ? undefined : { existsFlag: 1 },
				};
			}

			throw new Error(`Unexpected reconcile classifier SQL: ${ sql }`);
		},
	} as unknown as Database;
}

function createBaseRow(patch: Partial<LineageMetaRow>): LineageMetaRow {
	return {
		groupLineageId:         10,
		animeBaseMediaId:       100,
		animeGroupId:           20,
		animeGroupName:         "Official",
		knownInUser:            1,
		userGroupId:            30,
		userLineageStatus:      "active",
		lastUserModifiedAt:     null,
		isUserCreated:          0,
		collisionUserGroupId:   null,
		collisionIsUserCreated: null,
		...patch,
	};
}

describe(
	"classify-reconcile-row",
	() => {
		it(
			"imports a genuinely new upstream lineage when no user identity collides",
			() => {
				expect(classifyReconcileLineageMetaRow(
					createBaseRow({
						knownInUser:            0,
						userGroupId:            null,
						userLineageStatus:      null,
						isUserCreated:          null,
						collisionUserGroupId:   null,
						collisionIsUserCreated: null,
					}),
					noopDb,
				)).toEqual({
					classification:            "new_group",
					userGroupId:               null,
					newMediaIds:               [],
					conflictReason:            null,
					conflictAutoApplyBehavior: null,
					conflictRecommendedAction: null,
				});
			},
		);

		it(
			"blocks unknown lineage imports when a user-created group already owns the identity",
			() => {
				const classification = classifyReconcileLineageMetaRow(
					createBaseRow({
						knownInUser:            0,
						userGroupId:            null,
						userLineageStatus:      null,
						isUserCreated:          null,
						collisionUserGroupId:   99,
						collisionIsUserCreated: 1,
					}),
					noopDb,
				);

				expect(classification).toEqual({
					classification:            "conflict",
					userGroupId:               99,
					newMediaIds:               [],
					conflictReason:            "user_created_group",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_and_keep_current_grouping",
				});
			},
		);

		it(
			"surfaces missing upstream artifacts with warning guidance",
			() => {
				expect(classifyMissingUpstreamGroupRow({
					groupLineageId:       42,
					bestKnownBaseMediaId: 420,
					userGroupId:          7,
				})).toMatchObject({
					classification:            "conflict",
					conflictReason:            "upstream_group_missing",
					conflictAutoApplyBehavior: "skip_warn",
				});
				expect(classifyMissingUpstreamLineageRow({
					groupLineageId:       43,
					bestKnownBaseMediaId: 430,
					userGroupId:          8,
				})).toMatchObject({
					classification:            "conflict",
					conflictReason:            "upstream_lineage_removed",
					conflictAutoApplyBehavior: "skip_warn",
				});
			},
		);

		it(
			"blocks unknown lineage imports when a non-user group already owns the lineage identity",
			() => {
				expect(classifyReconcileLineageMetaRow(
					createBaseRow({
						knownInUser:            0,
						userGroupId:            null,
						userLineageStatus:      null,
						isUserCreated:          null,
						collisionUserGroupId:   98,
						collisionIsUserCreated: 0,
					}),
					noopDb,
				)).toMatchObject({
					classification: "conflict",
					userGroupId:    98,
					conflictReason: "lineage_identity_collision",
				});
			},
		);

		it.each([
			{
				name:   "a user-deleted lineage",
				patch:  { userLineageStatus: "deleted" as const },
				result: {
					classification: "user_deleted_lineage",
					conflictReason: null,
				},
			},
			{
				name:   "a user-merged lineage",
				patch:  { userLineageStatus: "merged" as const },
				result: {
					classification: "conflict",
					conflictReason: "lineage_merged",
				},
			},
			{
				name:   "a manually modified official lineage",
				patch:  { lastUserModifiedAt: 1_700_000_000_000 },
				result: {
					classification: "conflict",
					conflictReason: "lineage_ownership_changed",
				},
			},
			{
				name:   "a user-created group mapped to an official lineage",
				patch:  { isUserCreated: 1 as const },
				result: {
					classification: "conflict",
					conflictReason: "user_created_group",
				},
			},
			{
				name:   "a missing upstream group row",
				patch:  { animeGroupId: null },
				result: {
					classification: "conflict",
					conflictReason: "upstream_group_missing",
				},
			},
			{
				name:   "an active lineage with no user group owner",
				patch:  { userGroupId: null },
				result: {
					classification: "conflict",
					conflictReason: "lineage_ownership_changed",
				},
			},
		])(
			"does not auto-apply $name",
			({
				 patch,
				 result,
			 }) => {
				expect(classifyReconcileLineageMetaRow(
					createBaseRow(patch),
					noopDb,
				)).toMatchObject(result);
			},
		);

		it.each([
			{
				name:   "upstream media removal",
				db:     createMembershipDb({
					userOnlyMediaIds:     [ 101 ],
					missingAnimeMediaIds: [ 101 ],
				}),
				result: {
					classification: "conflict",
					conflictReason: "upstream_media_removed",
				},
			},
			{
				name:   "simultaneous additions and removals",
				db:     createMembershipDb({
					userOnlyMediaIds:  [ 101 ],
					animeOnlyMediaIds: [ 202 ],
				}),
				result: {
					classification: "conflict",
					conflictReason: "lineage_membership_reshaped",
				},
			},
			{
				name:   "user-only membership drift",
				db:     createMembershipDb({ userOnlyMediaIds: [ 101 ] }),
				result: {
					classification: "conflict",
					conflictReason: "lineage_membership_drift",
				},
			},
			{
				name:   "additive upstream media in a clean lineage",
				db:     createMembershipDb({
					animeOnlyMediaIds: [
						202,
						203,
					],
				}),
				result: {
					classification: "new_media_in_clean_lineage",
					newMediaIds:    [
						202,
						203,
					],
					conflictReason: null,
				},
			},
			{
				name:   "identical membership",
				db:     createMembershipDb({}),
				result: {
					classification: "clean_lineage",
					newMediaIds:    [],
					conflictReason: null,
				},
			},
		])(
			"classifies $name without destructive inference",
			({
				 db,
				 result,
			 }) => {
				expect(classifyReconcileLineageMetaRow(
					createBaseRow({}),
					db,
				)).toMatchObject(result);
			},
		);
	},
);
