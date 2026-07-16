import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	EpisodePlaybackIssueMoment,
	GroupMediaItemsPatchedEvent,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import { ROUTES } from "../../constants/route-config";
import {
	createRouteHistoryState,
	type NimlatRouteHistoryState,
	type NimlatRouteHistoryStateUpdater,
	readRouteHistoryState,
} from "../../types/router-history-state";

export type MediaTabKey =
	| typeof ROUTES.GROUPS.MEDIA.DETAILS
	| typeof ROUTES.GROUPS.MEDIA.EPISODES
	| typeof ROUTES.GROUPS.MEDIA.CHARACTERS
	| typeof ROUTES.GROUPS.MEDIA.STAFF
	| typeof ROUTES.GROUPS.MEDIA.DOWNLOAD;

export interface MediaTabItem {
	key: MediaTabKey;
	label: string;
}

export interface MediaRouteParams {
	groupId?: string;
	groupSource?: string;
	mediaId: string;
}

export type MediaLayoutNavigationTarget =
	| {
	to: typeof ROUTES.GROUPS.FULL_URL;
}
	| {
	params: {
		groupId: string;
		groupSource: string;
	};
	state: NimlatRouteHistoryStateUpdater;
	to: typeof ROUTES.GROUPS.GROUP.FULL_URL;
}
	| {
	params: MediaRouteParams;
	replace?: boolean;
	to: MediaTabRoute;
};

export interface MediaLayoutPlaybackIssueState {
	supportsMediaPlaybackIssueMoments: boolean;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments?: EpisodePlaybackIssueMoment[];
}

export interface MediaHeaderPlaybackIssueSavePayload {
	integrationStatus: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments: EpisodePlaybackIssueMoment[];
}

export interface MediaLayoutInspectionSnapshot extends MediaLayoutPlaybackIssueState {
	title: string;
	isFilm: boolean;
	hasEpisodesTab: boolean;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
}

export interface MediaLayoutPatchSnapshot {
	title?: string;
	isFilm?: boolean;
	hasEpisodesTab?: boolean;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
}

export type MediaNavigationState = NimlatRouteHistoryState;

type GroupMediaPatch = GroupMediaItemsPatchedEvent["patches"][number];

export type MediaTabRoute =
	| typeof ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL
	| typeof ROUTES.GROUPS.MEDIA.EPISODES_FULL_URL
	| typeof ROUTES.GROUPS.MEDIA.CHARACTERS_FULL_URL
	| typeof ROUTES.GROUPS.MEDIA.STAFF_FULL_URL
	| typeof ROUTES.GROUPS.MEDIA.DOWNLOAD_FULL_URL
	| typeof ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL
	| typeof ROUTES.GROUPS.STANDALONE_MEDIA.EPISODES_FULL_URL
	| typeof ROUTES.GROUPS.STANDALONE_MEDIA.CHARACTERS_FULL_URL
	| typeof ROUTES.GROUPS.STANDALONE_MEDIA.STAFF_FULL_URL
	| typeof ROUTES.GROUPS.STANDALONE_MEDIA.DOWNLOAD_FULL_URL;

const GROUPED_MEDIA_TAB_ROUTES: Record<MediaTabKey, MediaTabRoute> = {
	[ ROUTES.GROUPS.MEDIA.DETAILS ]:    ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.EPISODES ]:   ROUTES.GROUPS.MEDIA.EPISODES_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.CHARACTERS ]: ROUTES.GROUPS.MEDIA.CHARACTERS_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.STAFF ]:      ROUTES.GROUPS.MEDIA.STAFF_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.DOWNLOAD ]:   ROUTES.GROUPS.MEDIA.DOWNLOAD_FULL_URL,
};

const STANDALONE_MEDIA_TAB_ROUTES: Record<MediaTabKey, MediaTabRoute> = {
	[ ROUTES.GROUPS.MEDIA.DETAILS ]:    ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.EPISODES ]:   ROUTES.GROUPS.STANDALONE_MEDIA.EPISODES_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.CHARACTERS ]: ROUTES.GROUPS.STANDALONE_MEDIA.CHARACTERS_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.STAFF ]:      ROUTES.GROUPS.STANDALONE_MEDIA.STAFF_FULL_URL,
	[ ROUTES.GROUPS.MEDIA.DOWNLOAD ]:   ROUTES.GROUPS.STANDALONE_MEDIA.DOWNLOAD_FULL_URL,
};

export type MediaLayoutRouteContext =
	| {
	isStandalone: true;
	mediaId: string;
}
	| {
	isStandalone: false;
	groupId: string;
	groupSource: string;
	mediaId: string;
};

export function parseMediaNavigationState(state: unknown): MediaNavigationState {
	return readRouteHistoryState(state);
}

export function resolveMediaLayoutRouteContext({
																								 groupId,
																								 groupSource,
																								 mediaId,
																							 }: {
	groupId?: string;
	groupSource?: string;
	mediaId: string;
}): MediaLayoutRouteContext {
	if (typeof groupId !== "string" || typeof groupSource !== "string") {
		return {
			isStandalone: true,
			mediaId,
		};
	}

	return {
		isStandalone: false,
		groupId,
		groupSource,
		mediaId,
	};
}

export function createMediaRouteParams(routeContext: MediaLayoutRouteContext): MediaRouteParams {
	if (routeContext.isStandalone) {
		return { mediaId: routeContext.mediaId };
	}

	return {
		groupId:     routeContext.groupId,
		groupSource: routeContext.groupSource,
		mediaId:     routeContext.mediaId,
	};
}

export function createMediaDetailsRedirectTarget(routeContext: MediaLayoutRouteContext): MediaLayoutNavigationTarget {
	return {
		to:      resolveMediaTabRoute(
			ROUTES.GROUPS.MEDIA.DETAILS,
			routeContext.isStandalone,
		),
		params:  createMediaRouteParams(routeContext),
		replace: true,
	};
}

export function createMediaBackNavigationTarget(
	routeContext: MediaLayoutRouteContext,
	groupName?: string,
): MediaLayoutNavigationTarget {
	if (routeContext.isStandalone) {
		return { to: ROUTES.GROUPS.FULL_URL };
	}

	return {
		to:     ROUTES.GROUPS.GROUP.FULL_URL,
		params: {
			groupSource: routeContext.groupSource,
			groupId:     routeContext.groupId,
		},
		state:  createRouteHistoryState({ groupName }),
	};
}

export function createMediaTabNavigationTarget(
	routeContext: MediaLayoutRouteContext,
	key: string,
): MediaLayoutNavigationTarget {
	return {
		to:     resolveMediaTabRoute(
			coerceMediaTabKey(key),
			routeContext.isStandalone,
		),
		params: createMediaRouteParams(routeContext),
	};
}

function resolveMediaLayoutHasEpisodesTab(
	media: Pick<MediaInspectionData, "episodes" | "episodesCount" | "isFilm" | "jikanEpisodesCoverageStatus">,
): boolean {
	if (media.isFilm) {
		return false;
	}

	if (media.episodes.length > 0) {
		return true;
	}

	// An empty Jikan snapshot means provider metadata is unavailable, not that
	// AniList's catalog count is false. Keep the Episodes tab for known multi-
	// episode media so the empty page can explain the provider gap and offer retry.
	if (media.jikanEpisodesCoverageStatus === "empty") {
		return typeof media.episodesCount === "number" && media.episodesCount > 1;
	}

	return true;
}

export function createMediaLayoutInspectionSnapshot(media: MediaInspectionData): MediaLayoutInspectionSnapshot {
	return {
		title:  media.name,
		isFilm: Boolean(media.isFilm),
		hasEpisodesTab: resolveMediaLayoutHasEpisodesTab(media),
		integrationPercent:                media.integrationPercent ?? null,
		integrationStatus:                 media.integrationStatus ?? null,
		supportsMediaPlaybackIssueMoments: media.supportsMediaPlaybackIssueMoments,
		playbackIssueNote:                 media.playbackIssueNote,
		hasDubIssue:                       media.hasDubIssue,
		hasSubIssue:                       media.hasSubIssue,
		hasEncodingIssue:                  media.hasEncodingIssue,
		hasAudioIssue:                     media.hasAudioIssue,
		hasVideoIssue:                     media.hasVideoIssue,
		playbackIssueMoments:              media.playbackIssueMoments,
	};
}

export function createMediaLayoutPatchSnapshot(patch: GroupMediaPatch): MediaLayoutPatchSnapshot {
	const snapshot: MediaLayoutPatchSnapshot = {};
	if (typeof patch.name === "string") {
		snapshot.title = patch.name;
	}
	if (typeof patch.isFilm === "boolean") {
		snapshot.isFilm         = patch.isFilm;
		snapshot.hasEpisodesTab = !patch.isFilm;
	}
	if ("integrationPercent" in patch) {
		snapshot.integrationPercent = patch.integrationPercent ?? null;
	}
	if ("integrationStatus" in patch) {
		snapshot.integrationStatus = patch.integrationStatus ?? null;
	}

	return snapshot;
}

export function createMediaHeaderPlaybackIssuePatch(
	payload: MediaHeaderPlaybackIssueSavePayload,
): Partial<MediaLayoutPlaybackIssueState> {
	return {
		playbackIssueNote:    payload.playbackIssueNote,
		hasDubIssue:          payload.hasDubIssue,
		hasSubIssue:          payload.hasSubIssue,
		hasEncodingIssue:     payload.hasEncodingIssue,
		hasAudioIssue:        payload.hasAudioIssue,
		hasVideoIssue:        payload.hasVideoIssue,
		playbackIssueMoments: payload.playbackIssueMoments,
	};
}

export function resolveMediaTabKeyFromPathname(pathname: string): MediaTabKey {
	if (pathname.endsWith(`/${ ROUTES.GROUPS.MEDIA.EPISODES }`)) {
		return ROUTES.GROUPS.MEDIA.EPISODES;
	}
	if (pathname.endsWith(`/${ ROUTES.GROUPS.MEDIA.CHARACTERS }`)) {
		return ROUTES.GROUPS.MEDIA.CHARACTERS;
	}
	if (pathname.endsWith(`/${ ROUTES.GROUPS.MEDIA.STAFF }`)) {
		return ROUTES.GROUPS.MEDIA.STAFF;
	}
	if (pathname.endsWith(`/${ ROUTES.GROUPS.MEDIA.DOWNLOAD }`)) {
		return ROUTES.GROUPS.MEDIA.DOWNLOAD;
	}

	return ROUTES.GROUPS.MEDIA.DETAILS;
}

export function resolveVisibleMediaTabKey(activeKey: MediaTabKey, hasEpisodesTab: boolean): MediaTabKey {
	return !hasEpisodesTab && activeKey === ROUTES.GROUPS.MEDIA.EPISODES
		? ROUTES.GROUPS.MEDIA.DETAILS
		: activeKey;
}

export function coerceMediaTabKey(key: string): MediaTabKey {
	switch (key) {
		case ROUTES.GROUPS.MEDIA.EPISODES:
		case ROUTES.GROUPS.MEDIA.CHARACTERS:
		case ROUTES.GROUPS.MEDIA.STAFF:
		case ROUTES.GROUPS.MEDIA.DOWNLOAD:
			return key;
		default:
			return ROUTES.GROUPS.MEDIA.DETAILS;
	}
}

export function createMediaTabItems(hasEpisodesTab: boolean): MediaTabItem[] {
	return [
		{
			key:   ROUTES.GROUPS.MEDIA.DETAILS,
			label: "Details",
		},
		...(hasEpisodesTab
			? [
				{
					key:   ROUTES.GROUPS.MEDIA.EPISODES,
					label: "Episodes",
				},
			]
			: []),
		{
			key:   ROUTES.GROUPS.MEDIA.CHARACTERS,
			label: "Characters",
		},
		{
			key:   ROUTES.GROUPS.MEDIA.STAFF,
			label: "Staff",
		},
		{
			key:   ROUTES.GROUPS.MEDIA.DOWNLOAD,
			label: "Download",
		},
	];
}

export function resolveMediaTabRoute(tabKey: MediaTabKey, isStandalone: boolean): MediaTabRoute {
	return isStandalone
		? STANDALONE_MEDIA_TAB_ROUTES[ tabKey ]
		: GROUPED_MEDIA_TAB_ROUTES[ tabKey ];
}
