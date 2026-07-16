import {
	describe,
	expect,
	it,
} from "vitest";
import { ROUTES } from "../../constants/route-config";
import {
	coerceMediaTabKey,
	createMediaBackNavigationTarget,
	createMediaDetailsRedirectTarget,
	createMediaHeaderPlaybackIssuePatch,
	createMediaLayoutInspectionSnapshot,
	createMediaLayoutPatchSnapshot,
	createMediaRouteParams,
	createMediaTabItems,
	createMediaTabNavigationTarget,
	parseMediaNavigationState,
	resolveMediaLayoutRouteContext,
	resolveMediaTabKeyFromPathname,
	resolveMediaTabRoute,
	resolveVisibleMediaTabKey,
} from "./media-layout-model";

describe(
	"media-layout-model",
	() => {
		it(
			"parses optimistic navigation state defensively",
			() => {
				expect(parseMediaNavigationState(null)).toEqual({});
				expect(parseMediaNavigationState({
					groupName: "Group",
					mediaName: "Media",
					isFilm:    true,
				})).toEqual({
					groupName: "Group",
					mediaName: "Media",
					isFilm:    true,
				});
				expect(parseMediaNavigationState({
					groupName: 7,
					mediaName: false,
					isFilm:    "yes",
				})).toEqual({});
			},
		);

		it(
			"resolves standalone and group route contexts from route params",
			() => {
				expect(resolveMediaLayoutRouteContext({
					mediaId: "42",
				})).toEqual({
					isStandalone: true,
					mediaId:      "42",
				});
				expect(resolveMediaLayoutRouteContext({
					groupId:     "7",
					groupSource: "anime",
					mediaId:     "42",
				})).toEqual({
					isStandalone: false,
					groupId:      "7",
					groupSource:  "anime",
					mediaId:      "42",
				});
			},
		);

		it(
			"builds media route params and navigation targets for grouped and standalone layouts",
			() => {
				const standaloneContext = resolveMediaLayoutRouteContext({ mediaId: "42" });
				const groupContext      = resolveMediaLayoutRouteContext({
					groupId:     "7",
					groupSource: "official",
					mediaId:     "42",
				});

				expect(createMediaRouteParams(standaloneContext)).toEqual({ mediaId: "42" });
				expect(createMediaRouteParams(groupContext)).toEqual({
					groupId:     "7",
					groupSource: "official",
					mediaId:     "42",
				});
				expect(createMediaDetailsRedirectTarget(groupContext)).toMatchObject({
					to:      ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL,
					params:  {
						groupId:     "7",
						groupSource: "official",
						mediaId:     "42",
					},
					replace: true,
				});
				expect(createMediaTabNavigationTarget(
					standaloneContext,
					ROUTES.GROUPS.MEDIA.CHARACTERS,
				)).toEqual({
					to:     ROUTES.GROUPS.STANDALONE_MEDIA.CHARACTERS_FULL_URL,
					params: { mediaId: "42" },
				});
				expect(createMediaBackNavigationTarget(standaloneContext)).toEqual({ to: ROUTES.GROUPS.FULL_URL });

				const groupBackTarget = createMediaBackNavigationTarget(
					groupContext,
					"Cowboy Bebop",
				);
				expect(groupBackTarget).toMatchObject({
					to:     ROUTES.GROUPS.GROUP.FULL_URL,
					params: {
						groupId:     "7",
						groupSource: "official",
					},
				});
				const updateState = "state" in groupBackTarget
					? groupBackTarget.state as (previousState: Record<string, unknown>) => Record<string, unknown>
					: null;
				expect(updateState?.({})).toMatchObject({
					groupName: "Cowboy Bebop",
				});
			},
		);

		it(
			"derives active and visible tab keys from the current pathname",
			() => {
				expect(resolveMediaTabKeyFromPathname("/groups/media/42/details")).toBe(ROUTES.GROUPS.MEDIA.DETAILS);
				expect(resolveMediaTabKeyFromPathname("/groups/media/42/episodes")).toBe(ROUTES.GROUPS.MEDIA.EPISODES);
				expect(resolveMediaTabKeyFromPathname("/groups/media/42/characters")).toBe(ROUTES.GROUPS.MEDIA.CHARACTERS);
				expect(resolveMediaTabKeyFromPathname("/groups/media/42/staff")).toBe(ROUTES.GROUPS.MEDIA.STAFF);
				expect(resolveMediaTabKeyFromPathname("/groups/media/42/download")).toBe(ROUTES.GROUPS.MEDIA.DOWNLOAD);
				expect(resolveVisibleMediaTabKey(
					ROUTES.GROUPS.MEDIA.EPISODES,
					false,
				)).toBe(ROUTES.GROUPS.MEDIA.DETAILS);
			},
		);

		it(
			"builds tab items with the optional episodes tab",
			() => {
				expect(createMediaTabItems(true).map(item => item.key)).toEqual([
					ROUTES.GROUPS.MEDIA.DETAILS,
					ROUTES.GROUPS.MEDIA.EPISODES,
					ROUTES.GROUPS.MEDIA.CHARACTERS,
					ROUTES.GROUPS.MEDIA.STAFF,
					ROUTES.GROUPS.MEDIA.DOWNLOAD,
				]);
				expect(createMediaTabItems(false).map(item => item.key)).toEqual([
					ROUTES.GROUPS.MEDIA.DETAILS,
					ROUTES.GROUPS.MEDIA.CHARACTERS,
					ROUTES.GROUPS.MEDIA.STAFF,
					ROUTES.GROUPS.MEDIA.DOWNLOAD,
				]);
			},
		);

		it(
			"resolves tab routes for standalone and group media layouts",
			() => {
				expect(resolveMediaTabRoute(
					ROUTES.GROUPS.MEDIA.DOWNLOAD,
					true,
				)).toBe(ROUTES.GROUPS.STANDALONE_MEDIA.DOWNLOAD_FULL_URL);
				expect(resolveMediaTabRoute(
					ROUTES.GROUPS.MEDIA.DOWNLOAD,
					false,
				)).toBe(ROUTES.GROUPS.MEDIA.DOWNLOAD_FULL_URL);
				expect(coerceMediaTabKey("unknown")).toBe(ROUTES.GROUPS.MEDIA.DETAILS);
			},
		);

		it(
			"creates layout snapshots from media inspections without relying only on movie format",
			() => {
				expect(createMediaLayoutInspectionSnapshot({
					mediaId:                           42,
					name:                              "Jikan-empty special",
					isFilm:                            false,
					supportsMediaPlaybackIssueMoments: true,
					episodesCount:               1,
					jikanEpisodesCoverageStatus: "empty",
					integrationPercent:                undefined,
					integrationStatus:                 "tracked",
					playbackIssueNote:                 "sync issue",
					hasAudioIssue:                     true,
					playbackIssueMoments:              [
						{
							playbackIssueCategory: "audio",
							timeSeconds:           90,
						},
					],
					episodes:                          [],
				})).toEqual({
					title:                             "Jikan-empty special",
					isFilm:                            false,
					hasEpisodesTab:                    false,
					integrationPercent:                null,
					integrationStatus:                 "tracked",
					supportsMediaPlaybackIssueMoments: true,
					playbackIssueNote:                 "sync issue",
					hasDubIssue:                       undefined,
					hasSubIssue:                       undefined,
					hasEncodingIssue:                  undefined,
					hasAudioIssue:                     true,
					hasVideoIssue:                     undefined,
					playbackIssueMoments:              [
						{
							playbackIssueCategory: "audio",
							timeSeconds:           90,
						},
					],
				});
			},
		);

		it(
			"keeps the episodes tab for known multi-episode media when Jikan has no loadable rows",
			() => {
				expect(createMediaLayoutInspectionSnapshot({
					mediaId:                           43,
					name:                              "Don Quixote in the Tales of La Mancha",
					isFilm:                            false,
					supportsMediaPlaybackIssueMoments: true,
					episodesCount:                     23,
					jikanEpisodesCoverageStatus:       "empty",
					integrationPercent:                undefined,
					integrationStatus:                 null,
					episodes:                          [],
				})).toMatchObject({
					title:                             "Don Quixote in the Tales of La Mancha",
					hasEpisodesTab:                    true,
					supportsMediaPlaybackIssueMoments: true,
				});
			},
		);

		it(
			"creates sparse layout snapshots from media item patches",
			() => {
				expect(createMediaLayoutPatchSnapshot({
					mediaId:            42,
					name:               "Patched title",
					isFilm:             true,
					integrationPercent: undefined,
					integrationStatus:  null,
				})).toEqual({
					title:              "Patched title",
					isFilm:             true,
					hasEpisodesTab:     false,
					integrationPercent: null,
					integrationStatus:  null,
				});
				expect(createMediaLayoutPatchSnapshot({
					mediaId: 42,
				})).toEqual({});
			},
		);

		it(
			"creates header playback issue patches from saved payloads",
			() => {
				const payload = {
					integrationStatus:    "tracked" as const,
					playbackIssueNote:    "audio drifts after OP",
					hasAudioIssue:        true,
					hasDubIssue:          false,
					hasSubIssue:          true,
					hasEncodingIssue:     false,
					hasVideoIssue:        false,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "audio" as const,
							timeSeconds:           125,
						},
					],
				};

				expect(createMediaHeaderPlaybackIssuePatch(payload)).toEqual({
					playbackIssueNote:    payload.playbackIssueNote,
					hasDubIssue:          payload.hasDubIssue,
					hasSubIssue:          payload.hasSubIssue,
					hasEncodingIssue:     payload.hasEncodingIssue,
					hasAudioIssue:        payload.hasAudioIssue,
					hasVideoIssue:        payload.hasVideoIssue,
					playbackIssueMoments: payload.playbackIssueMoments,
				});
			},
		);
	},
);
