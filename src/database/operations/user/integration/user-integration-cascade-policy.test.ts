// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	collectUniqueNumbers,
	createAffectedGroupRefs,
	createPlaybackIssueMomentKey,
	dedupePlaybackIssueMoments,
	normalizeGroupRefs,
	resolveGroupingModeForGroupRef,
} from "./user-integration-cascade-policy";

describe(
	"user integration cascade policy",
	() => {
		it(
			"dedupes playback issue moments by category and timestamp with last write winning",
			() => {
				const result = dedupePlaybackIssueMoments([
					{
						playbackIssueCategory: "subtitles",
						timeSeconds:           12,
						note:                  "old",
					},
					{
						playbackIssueCategory: "audio",
						timeSeconds:           12,
						note:                  "audio",
					},
					{
						playbackIssueCategory: "subtitles",
						timeSeconds:           12,
						note:                  "new",
					},
				]);

				expect(createPlaybackIssueMomentKey(result[ 0 ])).toBe("subtitles-12");
				expect(result).toEqual([
					{
						playbackIssueCategory: "subtitles",
						timeSeconds:           12,
						note:                  "new",
					},
					{
						playbackIssueCategory: "audio",
						timeSeconds:           12,
						note:                  "audio",
					},
				]);
			},
		);

		it(
			"dedupes numeric ids without reordering first appearances",
			() => {
				expect(collectUniqueNumbers([
					3,
					1,
					3,
					2,
					1,
				])).toEqual([
					3,
					1,
					2,
				]);
			},
		);

		it(
			"normalizes group refs by source-qualified identity",
			() => {
				expect(normalizeGroupRefs([
					{
						source:  "official",
						groupId: 7,
					},
					{
						source:  "user",
						groupId: 7,
					},
					{
						source:  "official",
						groupId: 7,
					},
				])).toEqual([
					{
						source:  "official",
						groupId: 7,
					},
					{
						source:  "user",
						groupId: 7,
					},
				]);
			},
		);

		it(
			"creates source-qualified affected group refs",
			() => {
				expect(createAffectedGroupRefs(
					[
						4,
						5,
					],
					[
						5,
					],
				)).toEqual([
					{
						source:  "official",
						groupId: 4,
					},
					{
						source:  "official",
						groupId: 5,
					},
					{
						source:  "user",
						groupId: 5,
					},
				]);
			},
		);

		it(
			"maps renderer group source to persisted grouping mode",
			() => {
				expect(resolveGroupingModeForGroupRef({
					source:  "official",
					groupId: 1,
				})).toBe("anime");
				expect(resolveGroupingModeForGroupRef({
					source:  "user",
					groupId: 1,
				})).toBe("user");
			},
		);
	},
);
