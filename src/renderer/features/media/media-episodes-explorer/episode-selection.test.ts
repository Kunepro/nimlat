// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import { resolveNextEpisodeSelection } from "./episode-selection";

function toSortedList(selection: ReadonlySet<number>): number[] {
	return Array.from(selection).sort((left, right) => left - right);
}

describe(
	"resolveNextEpisodeSelection",
	() => {
		it(
			"toggles a single episode when range selection is not requested",
			() => {
				const nextSelection = resolveNextEpisodeSelection(
					new Set([ 1 ]),
					[
						1,
						2,
						3,
					],
					{
						episodeNumber:       2,
						isSelected:          true,
						shouldExtendRange:   false,
						anchorEpisodeNumber: 1,
					},
				);

				expect(toSortedList(nextSelection)).toEqual([
					1,
					2,
				]);
			},
		);

		it(
			"selects the full ordered range between the anchor and target episode",
			() => {
				const nextSelection = resolveNextEpisodeSelection(
					new Set([ 2 ]),
					[
						1,
						2,
						3,
						4,
						5,
					],
					{
						episodeNumber:       5,
						isSelected:          true,
						shouldExtendRange:   true,
						anchorEpisodeNumber: 2,
					},
				);

				expect(toSortedList(nextSelection)).toEqual([
					2,
					3,
					4,
					5,
				]);
			},
		);

		it(
			"removes an ordered range when a checked range is deselected",
			() => {
				const nextSelection = resolveNextEpisodeSelection(
					new Set([
						1,
						2,
						3,
						4,
						5,
					]),
					[
						1,
						2,
						3,
						4,
						5,
					],
					{
						episodeNumber:       4,
						isSelected:          false,
						shouldExtendRange:   true,
						anchorEpisodeNumber: 2,
					},
				);

				expect(toSortedList(nextSelection)).toEqual([
					1,
					5,
				]);
			},
		);

		it(
			"falls back to a single toggle when the anchor is no longer available",
			() => {
				const nextSelection = resolveNextEpisodeSelection(
					new Set([ 9 ]),
					[
						1,
						2,
						3,
					],
					{
						episodeNumber:       2,
						isSelected:          true,
						shouldExtendRange:   true,
						anchorEpisodeNumber: 9,
					},
				);

				expect(toSortedList(nextSelection)).toEqual([
					2,
					9,
				]);
			},
		);
	},
);
