import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	formatMediaStatus,
	formatNextAiringEpisode,
	formatReleaseDate,
	resolveGroupReleaseTimelineRef,
} from "./group-release-timeline-model";

function createTimelineRow(overrides: Partial<GroupReleaseTimelineRow> = {}): GroupReleaseTimelineRow {
	return {
		mediaId:              1,
		name:                 "Timeline Media",
		status:               "RELEASING",
		resolvedReleaseAt:    null,
		releaseDatePrecision: "date",
		releaseDateSource:    "media_start_date",
		...overrides,
	};
}

describe(
	"group release timeline model",
	() => {
		it(
			"resolves only supported group route references",
			() => {
				expect(resolveGroupReleaseTimelineRef(
					"user",
					"24",
				)).toEqual({
					source:  "user",
					groupId: 24,
				});
				expect(resolveGroupReleaseTimelineRef(
					"official",
					"NaN",
				)).toBeNull();
				expect(resolveGroupReleaseTimelineRef(
					"external",
					"24",
				)).toBeNull();
			},
		);

		it(
			"formats release and media statuses",
			() => {
				expect(formatReleaseDate(null)).toBe("N/A");
				expect(formatMediaStatus("RELEASING")).toBe("Ongoing");
				expect(formatMediaStatus("NOT_YET_RELEASED")).toBe("Not yet released");
				expect(formatMediaStatus(null)).toBe("Unknown");
			},
		);

		it(
			"formats next airing episode only for releasing rows",
			() => {
				expect(formatNextAiringEpisode(createTimelineRow({
					nextAiringEpisodeAt:     Date.UTC(
						2026,
						0,
						2,
					),
					nextAiringEpisodeNumber: 3,
				}))).toContain("Episode 3 - ");
				expect(formatNextAiringEpisode(createTimelineRow({
					status: "FINISHED",
				}))).toBe("-");
			},
		);
	},
);
