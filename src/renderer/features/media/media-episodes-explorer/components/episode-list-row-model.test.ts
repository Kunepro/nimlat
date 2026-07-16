import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	areEpisodeListRowPropsEqual,
	createEpisodeListRowStyle,
	type EpisodeListRowProps,
	resolveEpisodeThumbnailAlt,
	resolveEpisodeTitle,
	resolveEpisodeWatchedToggle,
} from "./episode-list-row-model";

function createEpisode(overrides: Partial<MediaEpisodeInspectionRow> = {}): MediaEpisodeInspectionRow {
	return {
		mediaId:              42,
		episodeNumber:        7,
		name:                 "Heavy Metal Queen",
		isWatched:            false,
		integrationStatus:    "downloaded",
		playbackIssueMoments: [
			{
				playbackIssueCategory: "video",
				timeSeconds:           72,
				note:                  "artifact",
			},
		],
		...overrides,
	};
}

function createProps(overrides: Partial<EpisodeListRowProps> = {}): EpisodeListRowProps {
	return {
		mediaId:                   "42",
		episode:                   createEpisode(),
		episodeThumbnail:          "episode.jpg",
		placeholderThumbnail:      "placeholder.jpg",
		recapLabel:                "Bounty trouble",
		virtualStart:              120,
		rowHeight:                 132,
		isSelected:                false,
		isUpdatingStatus:          false,
		isUpdatingWatched:         false,
		onSelectionChange:         vi.fn(),
		onIntegrationStatusChange: vi.fn(),
		onWatchedToggle:           vi.fn(),
		onEdit:                    vi.fn(),
		onPlaybackIssueSave:       vi.fn(),
		...overrides,
	};
}

describe(
	"episode-list-row-model",
	() => {
		it(
			"derives row style and user-facing episode labels",
			() => {
				expect(createEpisodeListRowStyle(
					120,
					132,
				)).toEqual({
					height:    132,
					transform: "translate3d(0, 120px, 0)",
				});
				expect(resolveEpisodeThumbnailAlt(createEpisode())).toBe("Heavy Metal Queen");
				expect(resolveEpisodeThumbnailAlt(createEpisode({ name: undefined }))).toBe("Episode 7");
				expect(resolveEpisodeTitle(createEpisode())).toBe("E 7: Heavy Metal Queen");
				expect(resolveEpisodeTitle(createEpisode({ name: undefined }))).toBe("E 7: Title not available yet");
			},
		);

		it(
			"derives watched toggle presentation and next state",
			() => {
				expect(resolveEpisodeWatchedToggle(createEpisode({ isWatched: false }))).toEqual({
					status:        "unwatched",
					checked:       false,
					nextIsWatched: true,
					ariaLabel:     "Mark episode 7 as watched",
				});
				expect(resolveEpisodeWatchedToggle(createEpisode({ isWatched: true }))).toEqual({
					status:        "watched",
					checked:       true,
					nextIsWatched: false,
					ariaLabel:     "Unmark episode 7 as watched",
				});
			},
		);

		it(
			"treats rows as equal when only ignored callback identities and episode object identity change",
			() => {
				const previous = createProps();
				const next     = createProps({
					episode:         createEpisode(),
					onEdit:          vi.fn(),
					onWatchedToggle: vi.fn(),
				});

				expect(areEpisodeListRowPropsEqual(
					previous,
					next,
				)).toBe(true);
			},
		);

		it(
			"detects render-affecting row changes",
			() => {
				const previous = createProps();

				expect(areEpisodeListRowPropsEqual(
					previous,
					createProps({ isSelected: true }),
				)).toBe(false);
				expect(areEpisodeListRowPropsEqual(
					previous,
					createProps({ virtualStart: 240 }),
				)).toBe(false);
				expect(areEpisodeListRowPropsEqual(
					previous,
					createProps({
						episode: createEpisode({
							playbackIssueMoments: [
								{
									playbackIssueCategory: "video",
									timeSeconds:           73,
									note:                  "artifact",
								},
							],
						}),
					}),
				)).toBe(false);
			},
		);
	},
);
