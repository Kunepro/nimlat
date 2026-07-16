import { parseIntegrationStatusControlValue } from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type {
	MediaWallTerminalAction,
	MediaWallTerminalMeta,
} from "../../../types/media-wall";

export const GROUP_MEDIA_REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

function padDatePart(value: number): string {
	return value.toString().padStart(
		2,
		"0",
	);
}

function parseRefreshDate(lastRefresh: string): Date | null {
	const refreshDate = new Date(lastRefresh);
	if (Number.isNaN(refreshDate.getTime()) || refreshDate.getTime() <= 0) {
		return null;
	}

	return refreshDate;
}

export function createGroupMediaVisualStateKey(watchStateOverrides: ReadonlyMap<number, boolean>): string {
	// The Pixi wall uses this key as a cache invalidation signal, so equivalent
	// override maps must produce the same key regardless of insertion order.
	return Array.from(watchStateOverrides.entries())
		.sort(([ firstMediaId ], [ secondMediaId ]) => firstMediaId - secondMediaId)
		.map(([ mediaId, watched ]) => `${ mediaId }:${ watched ? "1" : "0" }`)
		.join("|");
}

export function applyGroupMediaWatchOverride(
	media: GroupInspectionMediaCard,
	watchStateOverrides: ReadonlyMap<number, boolean>,
): GroupInspectionMediaCard {
	const override = watchStateOverrides.get(media.mediaId);
	if (override === undefined) {
		return media;
	}

	return {
		...media,
		isWatched: override,
	};
}

export function getGroupMediaAriaLabel(media: GroupInspectionMediaCard): string {
	return `Media: ${ media.name }`;
}

export function getGroupMediaWatchedState(
	media: GroupInspectionMediaCard,
	watchStateOverrides: ReadonlyMap<number, boolean>,
): boolean {
	return watchStateOverrides.get(media.mediaId) ?? media.isWatched === true;
}

export function isGroupMediaRefreshCooldownActive(
	media: GroupInspectionMediaCard,
	nowMs: number = Date.now(),
): boolean {
	if (media.hasHydrationIssue) {
		return false;
	}
	const refreshDate = parseRefreshDate(media.lastRefresh);
	return Boolean(
		refreshDate
		&& nowMs - refreshDate.getTime() < GROUP_MEDIA_REFRESH_COOLDOWN_MS,
	);
}

export function createGroupMediaLastRefreshMeta(lastRefresh: string): MediaWallTerminalMeta[] {
	const refreshDate = parseRefreshDate(lastRefresh);
	if (!refreshDate) {
		return [
			{
				label: "last refresh",
				value: "",
			},
			{
				label: "-- date",
				value: "never",
			},
			{
				label: "-- time",
				value: "--:--:--",
			},
		];
	}

	return [
		{
			label: "last refresh",
			value: "",
		},
		{
			label: "-- date",
			value: `${ refreshDate.getFullYear() }/${ padDatePart(refreshDate.getMonth() + 1) }/${ padDatePart(refreshDate.getDate()) }`,
		},
		{
			label: "-- time",
			value: `${ padDatePart(refreshDate.getHours()) }:${ padDatePart(refreshDate.getMinutes()) }:${ padDatePart(refreshDate.getSeconds()) }`,
		},
	];
}

export function getGroupMediaMenuActions(media: GroupInspectionMediaCard): MediaWallTerminalAction[] {
	const isIgnored = media.integrationStatus === "ignored";
	return [
		{
			id:    "edit",
			label: "Edit media",
		},
		{
			id:       "refresh",
			label:    "Refresh",
			disabled: isGroupMediaRefreshCooldownActive(media),
		},
		{
			id:                 isIgnored ? "restore" : "ignore",
			label:              isIgnored ? "Restore" : "Ignore",
			closeMenuBeforeRun: true,
			exitCardBeforeRun:  true,
		},
		{
			id:                 "removeFromGroup",
			label:              "Remove from group",
			closeMenuBeforeRun: true,
			confirmMessage:     "are you sure?",
			danger:             true,
			exitCardBeforeRun:  true,
		},
	];
}

export type GroupMediaMenuActionEffect =
	| { type: "edit" }
	| { type: "refresh"; mediaId: number }
	| { type: "updateIntegrationStatus"; mediaId: number; nextStatus: IntegrationStatus | null }
	| { type: "removeFromGroup" }
	| { type: "none" };

export function resolveGroupMediaMenuActionEffect(
	media: GroupInspectionMediaCard,
	actionId: string,
	nowMs: number = Date.now(),
): GroupMediaMenuActionEffect {
	switch (actionId) {
		case "edit":
			return { type: "edit" };
		case "refresh":
			return isGroupMediaRefreshCooldownActive(
				media,
				nowMs,
			)
				? { type: "none" }
				: {
					type:    "refresh",
					mediaId: media.mediaId,
				};
		case "ignore":
			return {
				type:       "updateIntegrationStatus",
				mediaId:    media.mediaId,
				nextStatus: parseIntegrationStatusControlValue("ignored"),
			};
		case "restore":
			return {
				type:       "updateIntegrationStatus",
				mediaId:    media.mediaId,
				nextStatus: null,
			};
		case "removeFromGroup":
			return { type: "removeFromGroup" };
		default:
			return { type: "none" };
	}
}

export function getGroupMediaMenuMeta(media: GroupInspectionMediaCard): MediaWallTerminalMeta[] {
	return [
		...createGroupMediaLastRefreshMeta(media.lastRefresh),
		{
			label: "issues",
			value: media.hasHydrationIssue || media.hasPlaybackIssue ? "yes" : "none",
		},
	];
}
