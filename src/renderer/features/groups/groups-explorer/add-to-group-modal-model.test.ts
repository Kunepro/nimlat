// @vitest-environment node

import type {
	GroupExplorerCard,
	LibraryDisplayItem,
} from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	assertAddToGroupMutationSucceeded,
	excludeSelectedGroups,
	formatAddToGroupModalError,
	getAddToGroupSummaryText,
	toSelectedGroupCards,
	toSelectionInputs,
} from "./add-to-group-modal-model";

function createGroupItem(groupId: number): LibraryDisplayItem {
	return {
		key:                `group:user:${ groupId }`,
		kind:               "group",
		name:               `Group ${ groupId }`,
		description:        `Description ${ groupId }`,
		imageUrl:           `source-${ groupId }.jpg`,
		displayImageUrl:    `display-${ groupId }.jpg`,
		integrationPercent: 50,
		integrationStatus:  "integrated",
		lastRefresh:        "2026-01-01T00:00:00.000Z",
		group:              {
			source: "user",
			groupId,
		},
	};
}

function createMediaItem(mediaId: number): LibraryDisplayItem {
	return {
		key:         `media:${ mediaId }`,
		kind:        "media",
		name:        `Media ${ mediaId }`,
		lastRefresh: "2026-01-01T00:00:00.000Z",
		mediaId,
	};
}

describe(
	"add-to-group-modal-model",
	() => {
		it(
			"maps mixed library rows into assignment inputs",
			() => {
				expect(toSelectionInputs([
					createGroupItem(10),
					createMediaItem(20),
				])).toEqual([
					{
						kind:  "group",
						group: {
							source:  "user",
							groupId: 10,
						},
					},
					{
						kind:    "media",
						mediaId: 20,
					},
				]);
			},
		);

		it(
			"builds preferred group cards from selected groups only",
			() => {
				expect(toSelectedGroupCards([
					createGroupItem(10),
					createMediaItem(20),
				])).toEqual([
					{
						id:                 10,
						name:               "Group 10",
						description:        "Description 10",
						imageUrl:           "display-10.jpg",
						baseMediaId:        undefined,
						integrationPercent: 50,
						integrationStatus:  "integrated",
						lastRefresh:        "2026-01-01T00:00:00.000Z",
					},
				]);
			},
		);

		it(
			"filters preferred groups out of the other-groups list",
			() => {
				const groups: GroupExplorerCard[]          = [
					{
						id:          1,
						name:        "Existing 1",
						lastRefresh: "now",
					},
					{
						id:          2,
						name:        "Existing 2",
						lastRefresh: "now",
					},
				];
				const preferredGroups: GroupExplorerCard[] = [
					{
						id:          2,
						name:        "Selected 2",
						lastRefresh: "now",
					},
				];

				expect(excludeSelectedGroups(
					groups,
					preferredGroups,
				).map((group) => group.id)).toEqual([ 1 ]);
			},
		);

		it(
			"formats selected item summary text",
			() => {
				expect(getAddToGroupSummaryText(1)).toBe("1 selected item");
				expect(getAddToGroupSummaryText(2)).toBe("2 selected items");
			},
		);

		it(
			"throws facade action errors with the original message",
			() => {
				expect(() => assertAddToGroupMutationSucceeded({
					success: false,
					error:   "target group was deleted",
				})).toThrow("target group was deleted");
				expect(() => assertAddToGroupMutationSucceeded({ success: true })).not.toThrow();
			},
		);

		it(
			"formats unknown modal errors",
			() => {
				expect(formatAddToGroupModalError(new Error("network lost"))).toBe("network lost");
				expect(formatAddToGroupModalError("nope")).toBe("unknown error");
			},
		);
	},
);
