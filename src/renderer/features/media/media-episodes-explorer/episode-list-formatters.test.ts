import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createEpisodeMetadataItems,
	formatEpisodeRecap,
} from "./episode-list-formatters";

describe(
	"episode-list-formatters",
	() => {
		it(
			"creates icon metadata items for the right-side rail",
			() => {
				const airedValue = new Intl.DateTimeFormat(
					undefined,
					{ dateStyle: "medium" },
				).format(new Date(
					2024,
					0,
					5,
				));

				expect(createEpisodeMetadataItems({
					aired:    "2024-01-05",
					duration: 1505,
					score:    8,
				})).toEqual([
					{
						kind:    "aired",
						tooltip: `Air date: ${ airedValue }`,
						value:   airedValue,
						isKnown: true,
					},
					{
						kind:    "duration",
						tooltip: "Duration: 25m 5s",
						value:   "25m 5s",
						isKnown: true,
					},
					{
						kind:    "score",
						tooltip: "Score: 8",
						value:   "8",
						isKnown: true,
					},
				]);
			},
		);

		it(
			"marks unknown metadata and keeps recap fallback stable",
			() => {
				expect(createEpisodeMetadataItems({})).toEqual([
					{
						kind:    "aired",
						tooltip: "Air date unknown",
						value:   "-",
						isKnown: false,
					},
					{
						kind:    "duration",
						tooltip: "Duration unknown",
						value:   "-",
						isKnown: false,
					},
					{
						kind:    "score",
						tooltip: "Score unknown",
						value:   "-",
						isKnown: false,
					},
				]);

				expect(formatEpisodeRecap("  A rescue mission.  ")).toBe("A rescue mission.");
				expect(formatEpisodeRecap()).toBe("No episode recap available yet.");
			},
		);
	},
);
