import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createGroupWatchedSummary,
	isGroupDetailsEventAffected,
	resolveGroupDetailsRef,
} from "./group-details-explorer-model";

function createGroup(mediasCount: number, watchedMediasCount: number): GroupInspectionSummary {
	return {
		groupId: 10,
		name:    "Group",
		mediasCount,
		watchedMediasCount,
	};
}

describe(
	"group details explorer model",
	() => {
		it(
			"resolves only supported group route references",
			() => {
				expect(resolveGroupDetailsRef(
					"official",
					"12",
				)).toEqual({
					source:  "official",
					groupId: 12,
				});
				expect(resolveGroupDetailsRef(
					"unknown",
					"12",
				)).toBeNull();
				expect(resolveGroupDetailsRef(
					"user",
					"nope",
				)).toBeNull();
			},
		);

		it(
			"filters group list events by affected group when ids are available",
			() => {
				const groupRef = {
					source:  "user" as const,
					groupId: 7,
				};

				expect(isGroupDetailsEventAffected(
					null,
					undefined,
				)).toBe(false);
				expect(isGroupDetailsEventAffected(
					groupRef,
					undefined,
				)).toBe(true);
				expect(isGroupDetailsEventAffected(
					groupRef,
					[ groupRef ],
				)).toBe(true);
				expect(isGroupDetailsEventAffected(
					groupRef,
					[
						{
							source:  "official",
							groupId: 7,
						},
					],
				)).toBe(false);
			},
		);

		it(
			"summarizes group watched state",
			() => {
				expect(createGroupWatchedSummary(createGroup(
					2,
					2,
				))).toEqual({
					mediasCount:        2,
					watchedMediasCount: 2,
					status:             "watched",
					isComplete:         true,
				});
				expect(createGroupWatchedSummary(createGroup(
					2,
					1,
				)).status).toBe("partial");
				expect(createGroupWatchedSummary(createGroup(
					0,
					0,
				))).toEqual({
					mediasCount:        0,
					watchedMediasCount: 0,
					status:             "unwatched",
					isComplete:         false,
				});
			},
		);
	},
);
